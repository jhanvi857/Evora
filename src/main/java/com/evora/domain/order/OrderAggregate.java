package com.evora.domain.order;

import com.evora.command.PlaceOrderCommand;
import com.evora.event.InventoryReservedEvent;
import com.evora.event.OrderConfirmedEvent;
import com.evora.event.OrderFailedEvent;
import com.evora.event.OrderPlacedEvent;
import com.evora.event.PaymentChargedEvent;
import com.evora.event.ShipmentCreatedEvent;
import com.evora.shared.AggregateRoot;
import com.evora.shared.DomainEvent;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class OrderAggregate extends AggregateRoot {
    private String orderId;
    private String customerId;
    private final List<OrderItem> items = new ArrayList<>();
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private OrderStatus status = OrderStatus.PENDING;
    private String lastIdempotencyKey;
    private boolean inventoryReserved;
    private boolean paymentCharged;
    private boolean shipmentCreated;
    private String failureReason;

    public static OrderAggregate rehydrate(List<? extends DomainEvent> history) {
        OrderAggregate aggregate = new OrderAggregate();
        aggregate.loadFromHistory(history);
        return aggregate;
    }

    public void place(PlaceOrderCommand command) {
        if (status != OrderStatus.PENDING) {
            if (command.idempotencyKey().equals(lastIdempotencyKey)) {
                return;
            }
            throw new IllegalStateException("Order is already placed or finalized");
        }

        BigDecimal computedTotal = command.items()
                .stream()
                .map(OrderItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        OrderPlacedEvent event = new OrderPlacedEvent(
                command.aggregateId(),
                version() + 1,
                command.occurredAt(),
                command.customerId(),
                command.items(),
                computedTotal,
                command.idempotencyKey()
        );
        applyNewEvent(event);
    }

    @Override
    protected void mutate(DomainEvent event) {
        if (event instanceof OrderPlacedEvent placed) {
            this.orderId = placed.aggregateId();
            this.customerId = placed.customerId();
            this.items.clear();
            this.items.addAll(placed.items());
            this.totalAmount = placed.totalAmount();
            this.status = OrderStatus.PLACED;
            this.lastIdempotencyKey = placed.idempotencyKey();
            this.failureReason = null;
            return;
        }

        if (event instanceof InventoryReservedEvent) {
            this.inventoryReserved = true;
            return;
        }

        if (event instanceof PaymentChargedEvent) {
            this.paymentCharged = true;
            return;
        }

        if (event instanceof ShipmentCreatedEvent) {
            this.shipmentCreated = true;
            return;
        }

        if (event instanceof OrderConfirmedEvent) {
            this.status = OrderStatus.CONFIRMED;
            return;
        }

        if (event instanceof OrderFailedEvent failed) {
            this.status = OrderStatus.FAILED;
            this.failureReason = failed.reason();
        }
    }

    public String orderId() {
        return orderId;
    }

    public String customerId() {
        return customerId;
    }

    public List<OrderItem> items() {
        return List.copyOf(items);
    }

    public BigDecimal totalAmount() {
        return totalAmount;
    }

    public OrderStatus status() {
        return status;
    }

    public boolean inventoryReserved() {
        return inventoryReserved;
    }

    public boolean paymentCharged() {
        return paymentCharged;
    }

    public boolean shipmentCreated() {
        return shipmentCreated;
    }

    public String failureReason() {
        return failureReason;
    }
}
