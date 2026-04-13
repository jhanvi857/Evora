package com.evora.eventstore;

import com.evora.shared.DomainEvent;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InMemoryEventStore implements EventStore {
    private final Map<String, List<DomainEvent>> streams = new HashMap<>();

    @Override
    public synchronized List<DomainEvent> load(String aggregateId) {
        List<DomainEvent> stream = streams.getOrDefault(aggregateId, List.of());
        return Collections.unmodifiableList(new ArrayList<>(stream));
    }

    @Override
    public synchronized void append(String aggregateId, int expectedVersion, List<DomainEvent> newEvents) {
        List<DomainEvent> stream = streams.computeIfAbsent(aggregateId, key -> new ArrayList<>());
        int currentVersion = stream.isEmpty() ? 0 : stream.get(stream.size() - 1).version();
        if (currentVersion != expectedVersion) {
            throw new OptimisticConcurrencyException(
                    "Version conflict for aggregate " + aggregateId + ": expected "
                            + expectedVersion + " but was " + currentVersion
            );
        }

        for (DomainEvent event : newEvents) {
            if (!aggregateId.equals(event.aggregateId())) {
                throw new IllegalArgumentException("Event aggregateId does not match stream aggregateId");
            }
            stream.add(event);
        }
    }
}
