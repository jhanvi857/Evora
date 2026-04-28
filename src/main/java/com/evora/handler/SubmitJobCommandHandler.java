package com.evora.handler;

import com.evora.command.SubmitJobCommand;
import com.evora.domain.Job;
import com.evora.domain.JobSubmitResult;
import com.evora.domain.events.JobSubmittedEvent;
import com.evora.store.PostgresJobStore;
import com.evora.bus.EventBus;

import java.util.Optional;

public class SubmitJobCommandHandler {
    private final PostgresJobStore jobStore;
    private final EventBus eventBus;

    public SubmitJobCommandHandler(PostgresJobStore jobStore, EventBus eventBus) {
        this.jobStore = jobStore;
        this.eventBus = eventBus;
    }

    public JobSubmitResult handle(SubmitJobCommand cmd) {
        Optional<Job> existing = jobStore.findByIdempotencyKey(cmd.idempotencyKey());
        if (existing.isPresent()) {
            return JobSubmitResult.alreadyExists(existing.get());
        }
        Job job = new Job(cmd);
        jobStore.insertJob(job);
        eventBus.publish(new JobSubmittedEvent(job));
        jobStore.appendJobEvent(job.getId(), "JOB_SUBMITTED", job);
        return JobSubmitResult.created(job);
    }
}
