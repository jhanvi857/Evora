package com.evora.saga;

import com.evora.application.OrderEventAppender;
import com.evora.bus.DomainEventSubscriber;
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
import com.evora.saga.service.InventoryService;
import com.evora.saga.service.PaymentService;
import com.evora.saga.service.ServiceResult;
import com.evora.saga.service.ShippingService;
import com.evora.shared.DomainEvent;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OrderSaga implements DomainEventSubscriber {
    private final OrderEventAppender appender;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final ShippingService shippingService;

    public OrderSaga(
            OrderEventAppender appender,
            InventoryService inventoryService,
            PaymentService paymentService,
            ShippingService shippingService
    ) {
        this.appender = appender;
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
        this.shippingService = shippingService;
    }

    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof OrderPlacedEvent placed) {
            handlePlaced(placed);
        }
    }

    private void handlePlaced(OrderPlacedEvent placed) {
        appender.append(placed.aggregateId(), currentVersion -> {
            int nextVersion = currentVersion;
            Instant now = Instant.now();
            List<DomainEvent> events = new ArrayList<>();

            ServiceResult reserve = inventoryService.reserve(
                    placed.aggregateId(),
                    placed.items(),
                    placed.idempotencyKey() + ":inventory:reserve"
            );
            if (!reserve.success()) {
                events.add(new InventoryReservationFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, reserve.error(), placed.idempotencyKey()
                ));
                events.add(new OrderFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, "Inventory reservation failed", placed.idempotencyKey()
                ));
                return events;
            }
            events.add(new InventoryReservedEvent(
                    placed.aggregateId(), ++nextVersion, now, reserve.referenceId(), placed.idempotencyKey()
            ));

            ServiceResult charge = paymentService.charge(
                    placed.aggregateId(),
                    placed.totalAmount(),
                    placed.idempotencyKey() + ":payment:charge"
            );
            if (!charge.success()) {
                events.add(new PaymentChargeFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, charge.error(), placed.idempotencyKey()
                ));
                ServiceResult release = inventoryService.release(
                        placed.aggregateId(),
                        placed.items(),
                        placed.idempotencyKey() + ":inventory:release"
                );
                events.add(new InventoryReleasedEvent(
                        placed.aggregateId(), ++nextVersion, now, release.referenceId(), placed.idempotencyKey()
                ));
                events.add(new OrderFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, "Payment failed after inventory reservation", placed.idempotencyKey()
                ));
                return events;
            }
            events.add(new PaymentChargedEvent(
                    placed.aggregateId(), ++nextVersion, now, charge.referenceId(), placed.totalAmount(), placed.idempotencyKey()
            ));

            ServiceResult shipment = shippingService.createShipment(
                    placed.aggregateId(),
                    placed.idempotencyKey() + ":shipping:create"
            );
            if (!shipment.success()) {
                events.add(new ShipmentCreationFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, shipment.error(), placed.idempotencyKey()
                ));
                ServiceResult refund = paymentService.refund(
                        placed.aggregateId(),
                        placed.totalAmount(),
                        placed.idempotencyKey() + ":payment:refund"
                );
                events.add(new PaymentRefundedEvent(
                        placed.aggregateId(), ++nextVersion, now, refund.referenceId(), placed.totalAmount(), placed.idempotencyKey()
                ));
                ServiceResult release = inventoryService.release(
                        placed.aggregateId(),
                        placed.items(),
                        placed.idempotencyKey() + ":inventory:release:shipment"
                );
                events.add(new InventoryReleasedEvent(
                        placed.aggregateId(), ++nextVersion, now, release.referenceId(), placed.idempotencyKey()
                ));
                events.add(new OrderFailedEvent(
                        placed.aggregateId(), ++nextVersion, now, "Shipment creation failed", placed.idempotencyKey()
                ));
                return events;
            }

            events.add(new ShipmentCreatedEvent(
                    placed.aggregateId(), ++nextVersion, now, shipment.referenceId(), placed.idempotencyKey()
            ));
            events.add(new OrderConfirmedEvent(
                    placed.aggregateId(), ++nextVersion, now, placed.idempotencyKey()
            ));
            return events;
        });
    }
}
