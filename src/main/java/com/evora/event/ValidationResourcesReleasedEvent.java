package com.evora.event;

import com.evora.shared.DomainEvent;
import java.time.Instant;

public record ValidationResourcesReleasedEvent(String aggregateId, int version, Instant occurredAt) implements DomainEvent {}
