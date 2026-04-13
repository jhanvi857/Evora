package main.java.com.evora.shared;

import java.util.ArrayList;
import java.util.List;

public abstract class AggregateRoot {
    private final List<DomainEvent> changes = new ArrayList<>();
    protected void apply(DomainEvent event) {
        changes.add(event);
        mutate(event);
    }

    protected abstract void mutate(DomainEvent event);

    public List<DomainEvent> getUncommittedEvents() {
        return changes;
    } 
}
