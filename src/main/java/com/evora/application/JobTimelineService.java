package com.evora.application;

import com.evora.eventstore.EventStore;
import com.evora.shared.DomainEvent;

import java.util.List;

public class JobTimelineService {
    private final EventStore eventStore;

    public JobTimelineService(EventStore eventStore) {
        this.eventStore = eventStore;
    }

    public List<DomainEvent> getTimeline(String jobId) {
        return eventStore.load(jobId);
    }
}
