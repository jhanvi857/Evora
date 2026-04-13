package com.evora.bus;

import com.evora.shared.DomainEvent;

public interface DomainEventSubscriber {
    void onEvent(DomainEvent event);
}
