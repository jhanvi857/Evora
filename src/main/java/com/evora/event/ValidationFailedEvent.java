package com.evora.event;

import com.evora.shared.DomainEvent;
import java.time.Instant;

public record ValidationFailedEvent(String aggregateId, int version, Instant occurredAt, String reason) implements DomainEvent {}
