package com.evora.event;

import com.evora.shared.DomainEvent;
import java.time.Instant;

public record ExecutionRolledBackEvent(String aggregateId, int version, Instant occurredAt) implements DomainEvent {}
