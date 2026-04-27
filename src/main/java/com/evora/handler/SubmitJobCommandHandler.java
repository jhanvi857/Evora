package com.evora.handler;

import com.evora.application.JobEventAppender;
import com.evora.application.ProcessedCommandStore;
import com.evora.command.SubmitJobCommand;
import com.evora.domain.order.JobAggregate;
import com.evora.shared.DomainEvent;

import java.util.List;

public class SubmitJobCommandHandler {
    private final JobEventAppender appender;
    private final ProcessedCommandStore processedCommandStore;

    public SubmitJobCommandHandler(JobEventAppender appender, ProcessedCommandStore processedCommandStore) {
        this.appender = appender;
        this.processedCommandStore = processedCommandStore;
    }

    public List<DomainEvent> handle(SubmitJobCommand command) {
        if (processedCommandStore.isProcessed(command.idempotencyKey())) {
            String existingAggregateId = processedCommandStore.getAggregateId(command.idempotencyKey());
            if (!command.aggregateId().equals(existingAggregateId)) {
                throw new IllegalStateException("idempotencyKey already used for another aggregate");
            }
            return List.of();
        }

        List<DomainEvent> history = appender.loadHistory(command.aggregateId());
        JobAggregate aggregate = JobAggregate.rehydrate(history);
        aggregate.submit(command);
        List<DomainEvent> uncommitted = aggregate.getUncommittedEvents();

        List<DomainEvent> events = appender.append(command.aggregateId(), ignored -> {
            if (uncommitted.isEmpty()) {
                return List.of();
            }
            return uncommitted;
        });
        processedCommandStore.markProcessed(command.idempotencyKey(), command.aggregateId());
        return events;
    }
}
