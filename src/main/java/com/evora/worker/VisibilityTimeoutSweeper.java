package com.evora.worker;

import com.evora.domain.Job;
import com.evora.store.PostgresJobStore;
import com.evora.bus.EventBus;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class VisibilityTimeoutSweeper implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(VisibilityTimeoutSweeper.class);

    private final PostgresJobStore jobStore;
    @SuppressWarnings("unused")
    private final EventBus eventBus;

    public VisibilityTimeoutSweeper(PostgresJobStore jobStore, EventBus eventBus) {
        this.jobStore = jobStore;
        this.eventBus = eventBus;
    }

    @Override
    public void run() {
        try {
            List<Job> expired = jobStore.findExpiredLocks();
            for (Job job : expired) {
                if (job.getAttemptCount() >= job.getMaxAttempts()) {
                    jobStore.moveToDLQ(job.getId(), "Lock expired after max attempts");
                    jobStore.appendJobEvent(job.getId(), "JOB_MOVED_TO_DLQ",
                            Map.of("reason", "lock_expired", "attempts", job.getAttemptCount()));
                    log.warn("Job {} moved to DLQ after {} attempts", job.getId(), job.getAttemptCount());
                } else {
                    jobStore.requeueJob(job.getId());
                    jobStore.appendJobEvent(job.getId(), "JOB_REQUEUED",
                            Map.of("reason", "lock_expired", "attempt", job.getAttemptCount()));
                    log.info("Job {} requeued (attempt {}/{})",
                            job.getId(), job.getAttemptCount(), job.getMaxAttempts());
                }
            }
        } catch (Exception e) {
            log.error("Error in VisibilityTimeoutSweeper", e);
        }
    }
}
