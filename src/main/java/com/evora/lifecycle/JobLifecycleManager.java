package com.evora.lifecycle;

import com.evora.domain.events.JobCompletedEvent;
import com.evora.domain.events.JobFailedEvent;
import com.evora.domain.Job;
import com.evora.store.PostgresJobStore;
import com.evora.bus.EventBus;

import java.util.Map;
import java.util.UUID;

public class JobLifecycleManager {
    private final PostgresJobStore jobStore;
    private final EventBus eventBus;

    public JobLifecycleManager(PostgresJobStore jobStore, EventBus eventBus) {
        this.jobStore = jobStore;
        this.eventBus = eventBus;
    }

    public void complete(UUID jobId, String workerId) {
        Job job = jobStore.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
        jobStore.completeJob(jobId, workerId);
        jobStore.appendJobEvent(jobId, "JOB_COMPLETED", Map.of("worker_id", workerId));
        eventBus.publish(new JobCompletedEvent(jobId, job.getQueue()));
    }
    
    public void fail(UUID jobId, String workerId, String error) {
        Job job = jobStore.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
        jobStore.failJob(jobId, workerId, error);
        jobStore.appendJobEvent(jobId, "JOB_FAILED", Map.of("error", error, "worker_id", workerId));
        eventBus.publish(new JobFailedEvent(jobId, job.getQueue()));
    }
}
