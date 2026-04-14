package com.evora.projection;

import com.evora.bus.DomainEventSubscriber;
import com.evora.domain.order.OrderStatus;
import com.evora.event.OrderConfirmedEvent;
import com.evora.event.OrderFailedEvent;
import com.evora.event.OrderPlacedEvent;
import com.evora.shared.DomainEvent;

import java.time.Instant;
import java.util.List;

public class OrderProjector implements DomainEventSubscriber {
    private final InMemoryOrderViewRepository repository;

    public OrderProjector(InMemoryOrderViewRepository repository) {
        this.repository = repository;
    }

    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof OrderPlacedEvent placed) {
            repository.save(new OrderView(
                    placed.aggregateId(),
                    placed.customerId(),
                    List.copyOf(placed.items()),
                    placed.totalAmount(),
                    OrderStatus.PLACED,
                    null,
                    placed.occurredAt()
            ));
            return;
        }

        if (event instanceof OrderConfirmedEvent confirmed) {
            repository.findByOrderId(confirmed.aggregateId()).ifPresent(existing ->
                    repository.save(new OrderView(
                            existing.orderId(),
                            existing.customerId(),
                            existing.items(),
                            existing.totalAmount(),
                            OrderStatus.CONFIRMED,
                            null,
                            confirmed.occurredAt()
                    ))
            );
            return;
        }

        if (event instanceof OrderFailedEvent failed) {
            repository.findByOrderId(failed.aggregateId()).ifPresent(existing ->
                    repository.save(new OrderView(
                            existing.orderId(),
                            existing.customerId(),
                            existing.items(),
                            existing.totalAmount(),
                            OrderStatus.FAILED,
                            failed.reason(),
                            failed.occurredAt()
                    ))
            );
            return;
        }

        repository.findByOrderId(event.aggregateId()).ifPresent(existing ->
                repository.save(new OrderView(
                        existing.orderId(),
                        existing.customerId(),
                        existing.items(),
                        existing.totalAmount(),
                        existing.status(),
                        existing.failureReason(),
                        Instant.now()
                ))
        );
    }
}
