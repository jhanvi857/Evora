package com.evora.domain.events;

import com.evora.shared.DomainEvent;
import java.time.Instant;
import java.util.UUID;

public record JobFailedEvent(String aggregateId, int version, Instant occurredAt, String queue) implements DomainEvent {
    public JobFailedEvent(UUID jobId, String queue) {
        this(jobId.toString(), 1, Instant.now(), queue);
    }
}
