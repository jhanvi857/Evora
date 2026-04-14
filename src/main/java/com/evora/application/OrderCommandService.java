package com.evora.application;

import com.evora.command.PlaceOrderCommand;
import com.evora.handler.PlaceOrderCommandHandler;
import com.evora.shared.DomainEvent;

import java.time.Instant;
import java.util.List;

public class OrderCommandService {
    private final PlaceOrderCommandHandler placeOrderCommandHandler;

    public OrderCommandService(PlaceOrderCommandHandler placeOrderCommandHandler) {
        this.placeOrderCommandHandler = placeOrderCommandHandler;
    }

    public List<DomainEvent> placeOrder(PlaceOrderRequest request) {
        PlaceOrderCommand command = new PlaceOrderCommand(
                request.orderId(),
                request.customerId(),
                request.items(),
                request.idempotencyKey(),
                Instant.now()
        );
        return placeOrderCommandHandler.handle(command);
    }
}
