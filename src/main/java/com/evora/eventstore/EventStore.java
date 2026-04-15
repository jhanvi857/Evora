package com.evora.eventstore;

import com.evora.shared.DomainEvent;

import java.util.List;

public interface EventStore {
    List<DomainEvent> load(String aggregateId);

    void append(String aggregateId, int expectedVersion, List<DomainEvent> newEvents);
    List<DomainEvent> loadAllEvents();
}
