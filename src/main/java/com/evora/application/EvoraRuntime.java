package com.evora.application;

import com.evora.bus.EventBus;
import com.evora.bus.InMemoryEventBus;
import com.evora.eventstore.EventStore;
import com.evora.eventstore.InMemoryEventStore;
import com.evora.handler.PlaceOrderCommandHandler;
import com.evora.projection.InMemoryOrderViewRepository;
import com.evora.projection.OrderProjector;
import com.evora.saga.OrderSaga;
import com.evora.saga.service.InventoryService;
import com.evora.saga.service.PaymentService;
import com.evora.saga.service.ShippingService;
import com.evora.saga.service.SimulatedInventoryService;
import com.evora.saga.service.SimulatedPaymentService;
import com.evora.saga.service.SimulatedShippingService;

public class EvoraRuntime {
    private final OrderCommandService commandService;
    private final OrderQueryService queryService;
    private final OrderTimelineService timelineService;

    private EvoraRuntime(OrderCommandService commandService, OrderQueryService queryService, OrderTimelineService timelineService) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.timelineService = timelineService;
    }

    public static EvoraRuntime create(EvoraRuntimeConfig config) {
        EventStore eventStore = new InMemoryEventStore();
        EventBus eventBus = new InMemoryEventBus();
        OrderEventAppender appender = new OrderEventAppender(eventStore, eventBus);
        ProcessedCommandStore processedCommandStore = new ProcessedCommandStore();

        InventoryService inventoryService = new SimulatedInventoryService(config.inventorySeed(), config.inventoryFailureRate());
        PaymentService paymentService = new SimulatedPaymentService(config.paymentSeed(), config.paymentFailureRate());
        ShippingService shippingService = new SimulatedShippingService(config.shippingSeed(), config.shippingFailureRate());

        InMemoryOrderViewRepository viewRepository = new InMemoryOrderViewRepository();
        OrderProjector projector = new OrderProjector(viewRepository);
        OrderSaga orderSaga = new OrderSaga(appender, inventoryService, paymentService, shippingService);

        eventBus.subscribe(projector);
        eventBus.subscribe(orderSaga);

        PlaceOrderCommandHandler placeOrderHandler = new PlaceOrderCommandHandler(appender, processedCommandStore);
        OrderCommandService commandService = new OrderCommandService(placeOrderHandler);
        OrderQueryService queryService = new OrderQueryService(viewRepository);
        OrderTimelineService timelineService = new OrderTimelineService(eventStore);

        return new EvoraRuntime(commandService, queryService, timelineService);
    }

    public OrderCommandService commandService() {
        return commandService;
    }

    public OrderQueryService queryService() {
        return queryService;
    }

    public OrderTimelineService timelineService() {
        return timelineService;
    }
}
