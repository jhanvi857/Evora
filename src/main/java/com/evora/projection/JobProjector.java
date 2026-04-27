package com.evora.projection;

import com.evora.bus.DomainEventSubscriber;
import com.evora.domain.order.JobStatus;
import com.evora.event.*;
import com.evora.shared.DomainEvent;
import com.evora.store.EventJsonSerde;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class JobProjector implements DomainEventSubscriber {
    private final JobViewRepository repository;
    private final EventJsonSerde serde;

    public JobProjector(JobViewRepository repository) {
        this.repository = repository;
        this.serde = new EventJsonSerde();
    }

    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof JobSubmittedEvent e) {
            repository.save(new JobView(
                    e.aggregateId(),
                    e.userId(),
                    e.jobType(),
                    e.priority(),
                    e.payload(),
                    JobStatus.SUBMITTED,
                    "SUBMITTED",
                    null,
                    e.occurredAt(),
                    List.of(toTimelineEntry(e))));
            return;
        }

        if (event instanceof ValidationPassedEvent) {
            updateState(event.aggregateId(), JobStatus.QUEUED, "VALIDATION_PASSED", null, event.occurredAt(), event);
        } else if (event instanceof ExecutionSuccessEvent) {
            updateState(event.aggregateId(), JobStatus.RUNNING, "EXECUTION_STARTED", null, event.occurredAt(), event);
        } else if (event instanceof NotificationSentEvent) {
            updateState(event.aggregateId(), JobStatus.RUNNING, "NOTIFICATION_SENT", null, event.occurredAt(), event);
        } else if (event instanceof JobCompletedEvent) {
            updateState(event.aggregateId(), JobStatus.COMPLETED, "COMPLETED", null, event.occurredAt(), event);
        } else if (event instanceof ValidationFailedEvent e) {
            updateState(event.aggregateId(), JobStatus.VALIDATION_FAILED, "VALIDATION_FAILED", e.reason(), event.occurredAt(), event);
        } else if (event instanceof ExecutionFailedEvent e) {
            updateState(event.aggregateId(), JobStatus.EXECUTION_FAILED, "EXECUTION_FAILED", e.reason(), event.occurredAt(), event);
        } else if (event instanceof NotificationFailedEvent e) {
            updateState(event.aggregateId(), JobStatus.NOTIFICATION_FAILED, "NOTIFICATION_FAILED", e.reason(), event.occurredAt(), event);
        } else if (event instanceof ValidationResourcesReleasedEvent) {
            updateState(event.aggregateId(), null, "RESOURCES_RELEASED", null, event.occurredAt(), event);
        } else if (event instanceof ExecutionRolledBackEvent) {
            updateState(event.aggregateId(), null, "EXECUTION_ROLLED_BACK", null, event.occurredAt(), event);
        }
    }

    private void updateState(String jobId, JobStatus status, String currentStep, String failureReason, Instant updatedAt, DomainEvent event) {
        repository.findByJobId(jobId).ifPresent(existing -> repository.save(new JobView(
                existing.jobId(),
                existing.userId(),
                existing.jobType(),
                existing.priority(),
                existing.payload(),
                status != null ? status : existing.status(),
                currentStep,
                failureReason != null ? failureReason : existing.failureReason(),
                updatedAt,
                appendTimeline(existing.timeline(), event)
        )));
    }

    private List<JobTimelineEntry> appendTimeline(List<JobTimelineEntry> timeline, DomainEvent event) {
        List<JobTimelineEntry> newTimeline = new ArrayList<>(timeline);
        newTimeline.add(toTimelineEntry(event));
        return List.copyOf(newTimeline);
    }

    private JobTimelineEntry toTimelineEntry(DomainEvent event) {
        return new JobTimelineEntry(
                event.getClass().getSimpleName(),
                event.version(),
                event.occurredAt(),
                serde.payloadAsMap(event)
        );
    }
}
