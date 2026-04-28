package com.evora.domain.events;

import com.evora.shared.DomainEvent;
import com.evora.domain.Job;
import java.time.Instant;

public record JobSubmittedEvent(String aggregateId, int version, Instant occurredAt, Job job) implements DomainEvent {
    public JobSubmittedEvent(Job job) {
        this(job.getId().toString(), 1, Instant.now(), job);
    }
}
