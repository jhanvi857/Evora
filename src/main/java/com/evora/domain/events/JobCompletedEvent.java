package com.evora.domain.events;

import com.evora.shared.DomainEvent;
import java.time.Instant;
import java.util.UUID;

public record JobCompletedEvent(String aggregateId, int version, Instant occurredAt, String queue) implements DomainEvent {
    public JobCompletedEvent(UUID jobId, String queue) {
        this(jobId.toString(), 1, Instant.now(), queue);
    }
}
