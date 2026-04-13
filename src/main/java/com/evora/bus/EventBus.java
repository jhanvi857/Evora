package com.evora.bus;

import com.evora.shared.DomainEvent;

public interface EventBus {
    void subscribe(DomainEventSubscriber subscriber);

    void publish(DomainEvent event);
}
