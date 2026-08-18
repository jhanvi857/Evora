package com.evora.client;

import com.evora.domain.Job;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public class EvoraWorker {
    private static final Logger log = LoggerFactory.getLogger(EvoraWorker.class);

    private final EvoraClient client;
    private final String workerId;
    private final String queue;
    private final int concurrency;
    private final long pollIntervalMs;
    private final EvoraJobHandler jobHandler;

    private final ExecutorService workerThreadPool;
    private final ScheduledExecutorService heartbeatScheduler;
    private final AtomicBoolean running = new AtomicBoolean(false);

    private EvoraWorker(Builder builder) {
        this.client = builder.client;
        this.workerId = builder.workerId != null ? builder.workerId : "worker-" + UUID.randomUUID().toString().substring(0, 8);
        this.queue = builder.queue != null ? builder.queue : "default";
        this.concurrency = Math.max(1, builder.concurrency);
        this.pollIntervalMs = Math.max(100, builder.pollIntervalMs);
        this.jobHandler = builder.jobHandler;

        this.workerThreadPool = Executors.newFixedThreadPool(concurrency, r -> {
            Thread t = new Thread(r, "evora-worker-thread-" + workerId);
            t.setDaemon(true);
            return t;
        });

        this.heartbeatScheduler = Executors.newScheduledThreadPool(2, r -> {
            Thread t = new Thread(r, "evora-heartbeat-thread-" + workerId);
            t.setDaemon(true);
            return t;
        });
    }

    public static Builder builder() {
        return new Builder();
    }

    public synchronized void start() {
        if (running.get()) return;
        running.set(true);
        log.info("[EvoraWorker] Worker '{}' started listening on queue '{}' (concurrency: {})", workerId, queue, concurrency);

        for (int i = 0; i < concurrency; i++) {
            workerThreadPool.submit(this::pollLoop);
        }
    }

    private void pollLoop() {
        while (running.get()) {
            try {
                Optional<Job> optionalJob = client.pollNextJob(workerId);
                if (optionalJob.isPresent()) {
                    Job job = optionalJob.get();
                    processJobWithHeartbeat(job);
                } else {
                    Thread.sleep(pollIntervalMs);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("[EvoraWorker] Error polling job on queue '{}': {}", queue, e.getMessage());
                try {
                    Thread.sleep(pollIntervalMs * 2);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }

    private void processJobWithHeartbeat(Job job) {
        String jobId = job.getId().toString();
        log.info("[EvoraWorker] [{}] Claimed job ID {}", workerId, jobId);

        // Schedule periodic heartbeat every 15 seconds
        ScheduledFuture<?> heartbeatTask = heartbeatScheduler.scheduleAtFixedRate(() -> {
            try {
                boolean extended = client.heartbeat(jobId, workerId);
                if (!extended) {
                    log.warn("[EvoraWorker] [{}] Lease expired or heartbeat lost for job ID {}", workerId, jobId);
                } else {
                    log.debug("[EvoraWorker] [{}] Heartbeat renewed for job ID {}", workerId, jobId);
                }
            } catch (Exception e) {
                log.error("[EvoraWorker] [{}] Heartbeat failed for job ID {}: {}", workerId, jobId, e.getMessage());
            }
        }, 15, 15, TimeUnit.SECONDS);

        try {
            JobResult result = jobHandler.handle(job);
            heartbeatTask.cancel(true);

            if (result.isSuccess()) {
                client.complete(jobId, workerId);
                log.info("[EvoraWorker] [{}] Successfully completed job ID {}", workerId, jobId);
            } else {
                client.fail(jobId, workerId, result.getError());
                log.warn("[EvoraWorker] [{}] Failed job ID {}: {}", workerId, jobId, result.getError());
            }
        } catch (Exception e) {
            heartbeatTask.cancel(true);
            log.error("[EvoraWorker] [{}] Exception executing job ID {}: {}", workerId, jobId, e.getMessage(), e);
            try {
                client.fail(jobId, workerId, e.getMessage());
            } catch (Exception ex) {
                log.error("[EvoraWorker] [{}] Failed to report error status for job ID {}", workerId, jobId, ex);
            }
        }
    }

    public synchronized void stop() {
        if (!running.get()) return;
        running.set(false);
        log.info("[EvoraWorker] Stopping worker '{}'...", workerId);

        workerThreadPool.shutdown();
        heartbeatScheduler.shutdown();
        try {
            if (!workerThreadPool.awaitTermination(5, TimeUnit.SECONDS)) {
                workerThreadPool.shutdownNow();
            }
            if (!heartbeatScheduler.awaitTermination(3, TimeUnit.SECONDS)) {
                heartbeatScheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            workerThreadPool.shutdownNow();
            heartbeatScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("[EvoraWorker] Worker '{}' stopped cleanly.", workerId);
    }

    public String getWorkerId() {
        return workerId;
    }

    public String getQueue() {
        return queue;
    }

    public boolean isRunning() {
        return running.get();
    }

    public static class Builder {
        private EvoraClient client;
        private String workerId;
        private String queue = "default";
        private int concurrency = 2;
        private long pollIntervalMs = 500;
        private EvoraJobHandler jobHandler;

        public Builder client(EvoraClient client) {
            this.client = client;
            return this;
        }

        public Builder workerId(String workerId) {
            this.workerId = workerId;
            return this;
        }

        public Builder queue(String queue) {
            this.queue = queue;
            return this;
        }

        public Builder concurrency(int concurrency) {
            this.concurrency = concurrency;
            return this;
        }

        public Builder pollIntervalMs(long pollIntervalMs) {
            this.pollIntervalMs = pollIntervalMs;
            return this;
        }

        public Builder handler(EvoraJobHandler jobHandler) {
            this.jobHandler = jobHandler;
            return this;
        }

        public EvoraWorker build() {
            if (client == null) {
                throw new IllegalArgumentException("EvoraClient must be specified");
            }
            if (jobHandler == null) {
                throw new IllegalArgumentException("EvoraJobHandler must be specified");
            }
            return new EvoraWorker(this);
        }
    }
}
