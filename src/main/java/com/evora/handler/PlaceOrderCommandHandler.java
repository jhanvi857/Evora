package com.evora.handler;

import com.evora.application.OrderEventAppender;
import com.evora.application.ProcessedCommandStore;
import com.evora.command.PlaceOrderCommand;
import com.evora.domain.order.OrderAggregate;
import com.evora.shared.DomainEvent;

import java.util.List;

public class PlaceOrderCommandHandler {
    private final OrderEventAppender appender;
    private final ProcessedCommandStore processedCommandStore;

    public PlaceOrderCommandHandler(OrderEventAppender appender, ProcessedCommandStore processedCommandStore) {
        this.appender = appender;
        this.processedCommandStore = processedCommandStore;
    }

    public List<DomainEvent> handle(PlaceOrderCommand command) {
        if (processedCommandStore.isProcessed(command.idempotencyKey())) {
            String existingAggregateId = processedCommandStore.getAggregateId(command.idempotencyKey());
            if (!command.aggregateId().equals(existingAggregateId)) {
                throw new IllegalStateException("idempotencyKey already used for another aggregate");
            }
            return List.of();
        }

        List<DomainEvent> history = appender.loadHistory(command.aggregateId());
        OrderAggregate aggregate = OrderAggregate.rehydrate(history);
        aggregate.place(command);
        List<DomainEvent> uncommitted = aggregate.getUncommittedEvents();

        List<DomainEvent> events = appender.append(command.aggregateId(), ignored -> {
            if (uncommitted.isEmpty()) {
                return List.of();
            }
            int version = ignored;
            for (DomainEvent event : uncommitted) {
                if (event.version() != ++version) {
                    throw new IllegalStateException("Aggregate emitted non-sequential versions");
                }
            }
            return uncommitted;
        });
        processedCommandStore.markProcessed(command.idempotencyKey(), command.aggregateId());
        return events;
    }
}
