package com.evora.application;

import java.util.HashMap;
import java.util.Map;

public class ProcessedCommandStore {
    private final Map<String, String> commandToAggregate = new HashMap<>();

    public synchronized boolean isProcessed(String idempotencyKey) {
        return commandToAggregate.containsKey(idempotencyKey);
    }

    public synchronized void markProcessed(String idempotencyKey, String aggregateId) {
        commandToAggregate.put(idempotencyKey, aggregateId);
    }

    public synchronized String getAggregateId(String idempotencyKey) {
        return commandToAggregate.get(idempotencyKey);
    }
}
