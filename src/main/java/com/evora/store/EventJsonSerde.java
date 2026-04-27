package com.evora.store;

import com.evora.event.*;
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
        register(JobSubmittedEvent.class);
        register(JobCompletedEvent.class);
        register(JobFailedEvent.class);
        register(ValidationPassedEvent.class);
        register(ValidationFailedEvent.class);
        register(ValidationResourcesReleasedEvent.class);
        register(ExecutionSuccessEvent.class);
        register(ExecutionFailedEvent.class);
        register(ExecutionRolledBackEvent.class);
        register(NotificationSentEvent.class);
        register(NotificationFailedEvent.class);
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
