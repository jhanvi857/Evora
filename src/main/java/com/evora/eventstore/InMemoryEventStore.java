package com.evora.eventstore;

import com.evora.shared.DomainEvent;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class InMemoryEventStore implements EventStore {
    private final Map<String, List<DomainEvent>> streams = new HashMap<>();
    private static final String STORAGE_FILE = "evora-event-store.json";
    private final com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    public InMemoryEventStore() {
        loadFromDisk();
    }

    private void loadFromDisk() {
        java.io.File file = new java.io.File(STORAGE_FILE);
        if (file.exists()) {
            try {
                Map<String, List<Map<String, Object>>> rawData = mapper.readValue(file,
                        new com.fasterxml.jackson.core.type.TypeReference<>() {
                        });
                System.out.println("[EventStore] Restored history from " + STORAGE_FILE);
            } catch (IOException e) {
                System.err.println("[EventStore] Failed to load history: " + e.getMessage());
            }
        }
    }

    private synchronized void saveToDisk() {
        try {
            mapper.writeValue(new java.io.File(STORAGE_FILE), streams);
        } catch (IOException e) {
            System.err.println("[EventStore] Failed to save history: " + e.getMessage());
        }
    }

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
                            + expectedVersion + " but was " + currentVersion);
        }

        for (DomainEvent event : newEvents) {
            if (!aggregateId.equals(event.aggregateId())) {
                throw new IllegalArgumentException("Event aggregateId does not match stream aggregateId");
            }
            stream.add(event);
        }
        saveToDisk();
    }
}
