package com.evora.application;

import com.evora.bus.EventBus;
import com.evora.eventstore.EventStore;
import com.evora.shared.DomainEvent;

import java.util.List;
import java.util.function.Function;

public class JobEventAppender {
    private final EventStore eventStore;
    private final EventBus eventBus;

    public JobEventAppender(EventStore eventStore, EventBus eventBus) {
        this.eventStore = eventStore;
        this.eventBus = eventBus;
    }

    public List<DomainEvent> loadHistory(String aggregateId) {
        return eventStore.load(aggregateId);
    }

    public synchronized List<DomainEvent> append(String aggregateId, Function<Integer, List<DomainEvent>> eventFactory) {
        List<DomainEvent> history = eventStore.load(aggregateId);
        int currentVersion = history.isEmpty() ? 0 : history.get(history.size() - 1).version();
        List<DomainEvent> newEvents = eventFactory.apply(currentVersion);
        if (newEvents.isEmpty()) {
            return List.of();
        }

        int expectedVersion = currentVersion;
        for (DomainEvent event : newEvents) {
            if (!aggregateId.equals(event.aggregateId())) {
                throw new IllegalArgumentException("Event aggregateId mismatch");
            }
            if (event.version() != expectedVersion + 1) {
                throw new IllegalArgumentException("Event versions must be sequential");
            }
            expectedVersion = event.version();
        }

        eventStore.append(aggregateId, currentVersion, newEvents);
        for (DomainEvent event : newEvents) {
            eventBus.publish(event);
        }
        return newEvents;
    }
}
