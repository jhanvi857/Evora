package com.evora.projection;

import com.evora.bus.DomainEventSubscriber;
import com.evora.domain.order.OrderStatus;
import com.evora.event.InventoryReleasedEvent;
import com.evora.event.InventoryReservationFailedEvent;
import com.evora.event.InventoryReservedEvent;
import com.evora.event.OrderConfirmedEvent;
import com.evora.event.OrderFailedEvent;
import com.evora.event.OrderPlacedEvent;
import com.evora.event.PaymentChargeFailedEvent;
import com.evora.event.PaymentChargedEvent;
import com.evora.event.PaymentRefundedEvent;
import com.evora.event.ShipmentCreatedEvent;
import com.evora.event.ShipmentCreationFailedEvent;
import com.evora.shared.DomainEvent;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OrderProjector implements DomainEventSubscriber {
    private final OrderViewRepository repository;
    private final com.evora.store.EventJsonSerde serde;

    public OrderProjector(OrderViewRepository repository) {
        this.repository = repository;
        this.serde = new com.evora.store.EventJsonSerde();
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
                    "ORDER_PLACED",
                    null,
                    placed.occurredAt(),
                    List.of(toTimelineEntry(placed))));
            return;
        }

        if (event instanceof OrderConfirmedEvent confirmed) {
            repository.findByOrderId(confirmed.aggregateId()).ifPresent(existing -> repository.save(withUpdate(
                    existing,
                    OrderStatus.CONFIRMED,
                    "ORDER_CONFIRMED",
                    null,
                    confirmed.occurredAt(),
                    confirmed
            )));
            return;
        }

        if (event instanceof InventoryReservedEvent reserved) {
            updateState(reserved.aggregateId(), "INVENTORY_RESERVED", null, reserved.occurredAt(), reserved);
            return;
        }

        if (event instanceof PaymentChargedEvent charged) {
            updateState(charged.aggregateId(), "PAYMENT_CHARGED", null, charged.occurredAt(), charged);
            return;
        }

        if (event instanceof ShipmentCreatedEvent shipped) {
            updateState(shipped.aggregateId(), "SHIPMENT_CREATED", null, shipped.occurredAt(), shipped);
            return;
        }

        if (event instanceof InventoryReservationFailedEvent failed) {
            updateState(failed.aggregateId(), "INVENTORY_FAILED", failed.reason(), failed.occurredAt(), failed);
            return;
        }

        if (event instanceof PaymentChargeFailedEvent failed) {
            updateState(failed.aggregateId(), "PAYMENT_FAILED", failed.reason(), failed.occurredAt(), failed);
            return;
        }

        if (event instanceof ShipmentCreationFailedEvent failed) {
            updateState(failed.aggregateId(), "SHIPPING_FAILED", failed.reason(), failed.occurredAt(), failed);
            return;
        }

        if (event instanceof PaymentRefundedEvent refunded) {
            updateState(refunded.aggregateId(), "PAYMENT_REFUNDED", null, refunded.occurredAt(), refunded);
            return;
        }

        if (event instanceof InventoryReleasedEvent released) {
            updateState(released.aggregateId(), "INVENTORY_RELEASED", null, released.occurredAt(), released);
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

            final String finalReason = reason;
            repository.findByOrderId(failed.aggregateId()).ifPresent(existing -> repository.save(withUpdate(
                    existing,
                    OrderStatus.FAILED,
                    "ORDER_FAILED",
                    finalReason,
                    failed.occurredAt(),
                    failed
            )));
            return;
        }
    }

    private void updateState(String orderId, String sagaStep, String reason, Instant occurredAt, DomainEvent event) {
        repository.findByOrderId(orderId).ifPresent(existing -> repository.save(withUpdate(
                existing,
                existing.status(),
                sagaStep,
                reason == null ? existing.failureReason() : reason,
                occurredAt,
                event
        )));
    }

    private OrderView withUpdate(
            OrderView existing,
            OrderStatus status,
            String sagaStep,
            String failureReason,
            Instant updatedAt,
            DomainEvent event
    ) {
        List<OrderTimelineEntry> timeline = new ArrayList<>(existing.timeline());
        timeline.add(toTimelineEntry(event));
        return new OrderView(
                existing.orderId(),
                existing.customerId(),
                existing.items(),
                existing.totalAmount(),
                status,
                sagaStep,
                failureReason,
                updatedAt,
                List.copyOf(timeline)
        );
    }

    private OrderTimelineEntry toTimelineEntry(DomainEvent event) {
        return new OrderTimelineEntry(
                event.getClass().getSimpleName(),
                event.version(),
                event.occurredAt(),
                serde.payloadAsMap(event)
        );
    }
}
