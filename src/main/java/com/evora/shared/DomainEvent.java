package main.java.com.evora.shared;

import java.time.Instant;

public interface DomainEvent {
    String aggregateId();
    int version();
    Instant occurredAt();
}
