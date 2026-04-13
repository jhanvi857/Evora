package com.evora.shared;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class AggregateRoot {
    private final List<DomainEvent> changes = new ArrayList<>();
    private int version;
    private int originalVersion;

    protected void applyNewEvent(DomainEvent event) {
        applyEvent(event, true);
    }

    public void loadFromHistory(List<? extends DomainEvent> history) {
        for (DomainEvent event : history) {
            applyEvent(event, false);
        }
        this.originalVersion = this.version;
    }

    private void applyEvent(DomainEvent event, boolean isNew) {
        if (isNew) {
            changes.add(event);
        }
        mutate(event);
        this.version = event.version();
    }

    protected abstract void mutate(DomainEvent event);

    public List<DomainEvent> getUncommittedEvents() {
        return Collections.unmodifiableList(changes);
    }

    public void markChangesCommitted() {
        changes.clear();
        this.originalVersion = this.version;
    }

    public int version() {
        return version;
    }

    public int originalVersion() {
        return originalVersion;
    }
}
