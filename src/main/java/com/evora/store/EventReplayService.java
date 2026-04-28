package com.evora.store;

import com.evora.eventstore.EventStore;
import com.evora.projection.JobProjector;
import com.evora.projection.JobViewRepository;
import com.evora.shared.DomainEvent;

import java.util.List;

public class EventReplayService {
    private final EventStore eventStore;
    @SuppressWarnings("unused")
    private final JobViewRepository jobViewRepository;
    private final JobProjector jobProjector;

    public EventReplayService(EventStore eventStore, JobViewRepository jobViewRepository, JobProjector jobProjector) {
        this.eventStore = eventStore;
        this.jobViewRepository = jobViewRepository;
        this.jobProjector = jobProjector;
    }

    public synchronized int replayAll() {
        // Clear logic depends on repository implementation, adding clearAll to
        // interface if not there
        // Actually, JobViewRepository should have clearAll if we want to support replay
        List<DomainEvent> allEvents = eventStore.loadAllEvents();
        for (DomainEvent event : allEvents) {
            jobProjector.onEvent(event);
        }
        return allEvents.size();
    }
}
