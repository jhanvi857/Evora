package com.evora.saga;

import com.evora.application.JobEventAppender;
import com.evora.bus.DomainEventSubscriber;
import com.evora.event.*;
import com.evora.saga.service.ExecutionService;
import com.evora.saga.service.NotificationService;
import com.evora.saga.service.ServiceResult;
import com.evora.saga.service.ValidationService;
import com.evora.shared.DomainEvent;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class JobExecutionSaga implements DomainEventSubscriber {
    private final JobEventAppender appender;
    private final ValidationService validationService;
    private final ExecutionService executionService;
    private final NotificationService notificationService;

    public JobExecutionSaga(
            JobEventAppender appender,
            ValidationService validationService,
            ExecutionService executionService,
            NotificationService notificationService
    ) {
        this.appender = appender;
        this.validationService = validationService;
        this.executionService = executionService;
        this.notificationService = notificationService;
    }

    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof JobSubmittedEvent submitted) {
            handleSubmitted(submitted);
        }
    }

    private void handleSubmitted(JobSubmittedEvent submitted) {
        appender.append(submitted.aggregateId(), currentVersion -> {
            int nextVersion = currentVersion;
            Instant now = Instant.now();
            List<DomainEvent> events = new ArrayList<>();

            // 1. Validation
            ServiceResult valResult = validationService.validate(
                    submitted.aggregateId(),
                    submitted.jobType(),
                    submitted.payload(),
                    submitted.idempotencyKey() + ":val"
            );
            if (!valResult.success()) {
                events.add(new ValidationFailedEvent(
                        submitted.aggregateId(), ++nextVersion, now, valResult.error()
                ));
                return events;
            }
            events.add(new ValidationPassedEvent(submitted.aggregateId(), ++nextVersion, now));

            // 2. Execution
            ServiceResult execResult = executionService.execute(
                    submitted.aggregateId(),
                    submitted.jobType(),
                    submitted.payload(),
                    submitted.idempotencyKey() + ":exec"
            );
            if (!execResult.success()) {
                events.add(new ExecutionFailedEvent(
                        submitted.aggregateId(), ++nextVersion, now, execResult.error()
                ));
                // Compensation: release resources
                validationService.releaseResources(submitted.aggregateId(), submitted.idempotencyKey() + ":val:rel");
                events.add(new ValidationResourcesReleasedEvent(submitted.aggregateId(), ++nextVersion, now));
                return events;
            }
            events.add(new ExecutionSuccessEvent(submitted.aggregateId(), ++nextVersion, now));

            // 3. Notification
            ServiceResult notifResult = notificationService.notify(
                    submitted.aggregateId(),
                    "COMPLETED",
                    submitted.idempotencyKey() + ":notif"
            );
            if (!notifResult.success()) {
                events.add(new NotificationFailedEvent(
                        submitted.aggregateId(), ++nextVersion, now, notifResult.error()
                ));
                // Compensation: rollback execution and release resources
                executionService.rollback(submitted.aggregateId(), submitted.idempotencyKey() + ":exec:roll");
                events.add(new ExecutionRolledBackEvent(submitted.aggregateId(), ++nextVersion, now));
                
                validationService.releaseResources(submitted.aggregateId(), submitted.idempotencyKey() + ":val:rel:notif");
                events.add(new ValidationResourcesReleasedEvent(submitted.aggregateId(), ++nextVersion, now));
                return events;
            }
            events.add(new NotificationSentEvent(submitted.aggregateId(), ++nextVersion, now));
            events.add(new JobCompletedEvent(submitted.aggregateId(), ++nextVersion, now));

            return events;
        });
    }
}
