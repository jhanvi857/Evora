package com.evora.store;

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
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.HashMap;
import java.util.Map;

public class EventJsonSerde {
    private final ObjectMapper objectMapper;
    private final Map<String, Class<? extends DomainEvent>> typeToClass;

    public EventJsonSerde() {
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.typeToClass = new HashMap<>();
        register(OrderPlacedEvent.class);
        register(OrderConfirmedEvent.class);
        register(OrderFailedEvent.class);
        register(InventoryReservedEvent.class);
        register(InventoryReservationFailedEvent.class);
        register(InventoryReleasedEvent.class);
        register(PaymentChargedEvent.class);
        register(PaymentChargeFailedEvent.class);
        register(PaymentRefundedEvent.class);
        register(ShipmentCreatedEvent.class);
        register(ShipmentCreationFailedEvent.class);
    }

    public String eventType(DomainEvent event) {
        return event.getClass().getSimpleName();
    }

    public String serialize(DomainEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize event: " + event.getClass().getSimpleName(), e);
        }
    }

    public DomainEvent deserialize(String eventType, String payload) {
        Class<? extends DomainEvent> eventClass = typeToClass.get(eventType);
        if (eventClass == null) {
            throw new IllegalArgumentException("Unsupported event type: " + eventType);
        }
        try {
            return objectMapper.readValue(payload, eventClass);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to deserialize event type: " + eventType, e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> payloadAsMap(DomainEvent event) {
        return objectMapper.convertValue(event, Map.class);
    }

    private void register(Class<? extends DomainEvent> eventClass) {
        typeToClass.put(eventClass.getSimpleName(), eventClass);
    }
}
