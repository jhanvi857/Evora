package com.evora.domain.order;

import com.evora.command.SubmitJobCommand;
import com.evora.event.*;
import com.evora.shared.AggregateRoot;
import com.evora.shared.DomainEvent;

import java.util.List;

public class JobAggregate extends AggregateRoot {
    private String jobId;
    private String userId;
    private String jobType;
    private String priority;
    private String payload;
    private JobStatus status = JobStatus.SUBMITTED;
    private String lastIdempotencyKey;
    private String failureReason;

    public static JobAggregate rehydrate(List<? extends DomainEvent> history) {
        JobAggregate aggregate = new JobAggregate();
        aggregate.loadFromHistory(history);
        return aggregate;
    }

    public void submit(SubmitJobCommand command) {
        if (lastIdempotencyKey != null && command.idempotencyKey().equals(lastIdempotencyKey)) {
            return;
        }
        
        JobSubmittedEvent event = new JobSubmittedEvent(
                command.aggregateId(),
                version() + 1,
                command.occurredAt(),
                command.userId(),
                command.jobType(),
                command.priority(),
                command.payload(),
                command.idempotencyKey()
        );
        applyNewEvent(event);
    }

    @Override
    protected void mutate(DomainEvent event) {
        if (event instanceof JobSubmittedEvent e) {
            this.jobId = e.aggregateId();
            this.userId = e.userId();
            this.jobType = e.jobType();
            this.priority = e.priority();
            this.payload = e.payload();
            this.status = JobStatus.SUBMITTED;
            this.lastIdempotencyKey = e.idempotencyKey();
            this.failureReason = null;
        } else if (event instanceof ValidationPassedEvent) {
            this.status = JobStatus.QUEUED;
        } else if (event instanceof ExecutionSuccessEvent) {
            this.status = JobStatus.RUNNING;
        } else if (event instanceof JobCompletedEvent) {
            this.status = JobStatus.COMPLETED;
        } else if (event instanceof ValidationFailedEvent e) {
            this.status = JobStatus.VALIDATION_FAILED;
            this.failureReason = e.reason();
        } else if (event instanceof ExecutionFailedEvent e) {
            this.status = JobStatus.EXECUTION_FAILED;
            this.failureReason = e.reason();
        } else if (event instanceof NotificationFailedEvent e) {
            this.status = JobStatus.NOTIFICATION_FAILED;
            this.failureReason = e.reason();
        } else if (event instanceof JobFailedEvent e) {
            // General failure
            this.failureReason = e.reason();
        }
    }

    public String jobId() { return jobId; }
    public String userId() { return userId; }
    public String jobType() { return jobType; }
    public String priority() { return priority; }
    public String payload() { return payload; }
    public JobStatus status() { return status; }
    public String failureReason() { return failureReason; }
}
