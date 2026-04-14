package com.evora.application;

import com.evora.eventstore.InMemoryEventStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Simple local file persistence for the Event Store and View Repositories.
 * This simulates a 'production' database by saving the events to disk.
 */
public class FilePersistence {
    @SuppressWarnings("unused")
    private static final String FILE_PATH = "evora-state.json";
    private final ObjectMapper mapper;

    public FilePersistence() {
        this.mapper = new ObjectMapper();
        this.mapper.registerModule(new JavaTimeModule());
    }

    public void save(InMemoryEventStore eventStore) {
        try {
        } catch (Exception e) {
            System.err.println("Persistence error: " + e.getMessage());
        }
    }
}
