package com.evora.bus;

import com.evora.shared.DomainEvent;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class InMemoryEventBus implements EventBus {
    private final List<DomainEventSubscriber> subscribers = new CopyOnWriteArrayList<>();

    @Override
    public void subscribe(DomainEventSubscriber subscriber) {
        subscribers.add(subscriber);
    }

    @Override
    public void publish(DomainEvent event) {
        for (DomainEventSubscriber subscriber : subscribers) {
            subscriber.onEvent(event);
        }
    }
}
