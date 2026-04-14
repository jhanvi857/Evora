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
                    placed.occurredAt()));
            return;
        }

        if (event instanceof OrderConfirmedEvent confirmed) {
            repository.findByOrderId(confirmed.aggregateId()).ifPresent(existing -> repository.save(new OrderView(
                    existing.orderId(),
                    existing.customerId(),
                    existing.items(),
                    existing.totalAmount(),
                    OrderStatus.CONFIRMED,
                    null,
                    confirmed.occurredAt())));
            return;
        }

        if (event instanceof com.evora.event.InventoryReservationFailedEvent failed) {
            updateStatus(failed.aggregateId(), "STOCK_OUT", failed.reason(), failed.occurredAt());
            return;
        }

        if (event instanceof com.evora.event.PaymentChargeFailedEvent failed) {
            updateStatus(failed.aggregateId(), "PAYMENT_DECLINED", failed.reason(), failed.occurredAt());
            return;
        }

        if (event instanceof com.evora.event.ShipmentCreationFailedEvent failed) {
            updateStatus(failed.aggregateId(), "SHIPPING_ERROR", failed.reason(), failed.occurredAt());
            return;
        }

        if (event instanceof OrderFailedEvent failed) {
            String reason = failed.reason().toUpperCase().replace(" ", "_");
            if (reason.contains("INVENTORY"))
                reason = "STOCK_OUT";
            if (reason.contains("PAYMENT"))
                reason = "PAYMENT_DECLINED";
            if (reason.contains("SHIPPING"))
                reason = "SHIPPING_ERROR";

            updateStatus(failed.aggregateId(), reason, failed.reason(), failed.occurredAt());
            return;
        }
    }

    private void updateStatus(String orderId, String status, String reason, Instant occurredAt) {
        repository.findByOrderId(orderId).ifPresent(existing -> repository.save(new OrderView(
                existing.orderId(),
                existing.customerId(),
                existing.items(),
                existing.totalAmount(),
                OrderStatus.FAILED,
                status,
                occurredAt)));
    }
}
