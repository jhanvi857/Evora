package com.evora.store;

import com.evora.eventstore.EventStore;
import com.evora.projection.OrderProjector;
import com.evora.projection.OrderViewRepository;
import com.evora.shared.DomainEvent;

import java.util.List;

public class EventReplayService {
    private final EventStore eventStore;
    private final OrderViewRepository orderViewRepository;
    private final OrderProjector orderProjector;

    public EventReplayService(EventStore eventStore, OrderViewRepository orderViewRepository, OrderProjector orderProjector) {
        this.eventStore = eventStore;
        this.orderViewRepository = orderViewRepository;
        this.orderProjector = orderProjector;
    }

    public synchronized int replayAll() {
        orderViewRepository.clearAll();
        List<DomainEvent> allEvents = eventStore.loadAllEvents();
        for (DomainEvent event : allEvents) {
            orderProjector.onEvent(event);
        }
        return allEvents.size();
    }
}
