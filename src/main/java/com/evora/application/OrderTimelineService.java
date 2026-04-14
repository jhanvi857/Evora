package com.evora.application;

import com.evora.eventstore.EventStore;
import com.evora.shared.DomainEvent;

import java.util.List;

public class OrderTimelineService {
    private final EventStore eventStore;

    public OrderTimelineService(EventStore eventStore) {
        this.eventStore = eventStore;
    }

    public List<DomainEvent> getTimeline(String orderId) {
        return eventStore.load(orderId);
    }
}
