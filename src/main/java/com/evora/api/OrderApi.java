package com.evora.api;

import com.evora.application.OrderCommandService;
import com.evora.application.OrderQueryService;
import com.evora.application.OrderTimelineService;
import com.evora.application.PlaceOrderRequest;
import com.evora.projection.OrderView;
import com.evora.shared.DomainEvent;

import java.util.List;
import java.util.Optional;

public class OrderApi {
    private final OrderCommandService commandService;
    private final OrderQueryService queryService;
    private final OrderTimelineService timelineService;

    public OrderApi(OrderCommandService commandService, OrderQueryService queryService, OrderTimelineService timelineService) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.timelineService = timelineService;
    }

    public List<DomainEvent> placeOrder(PlaceOrderApiRequest request) {
        return commandService.placeOrder(new PlaceOrderRequest(
                request.orderId(),
                request.customerId(),
                request.items(),
                request.idempotencyKey()
        ));
    }

    public Optional<OrderApiResponse> getOrder(String orderId) {
        return queryService.getOrderById(orderId).map(this::toApiResponse);
    }

    public List<OrderApiResponse> listOrders() {
        return queryService.listOrders().stream().map(this::toApiResponse).toList();
    }

    public List<DomainEvent> getOrderTimeline(String orderId) {
        return timelineService.getTimeline(orderId);
    }

    private OrderApiResponse toApiResponse(OrderView view) {
        return new OrderApiResponse(
                view.orderId(),
                view.customerId(),
                view.items(),
                view.totalAmount(),
                view.status(),
                view.failureReason(),
                view.updatedAt()
        );
    }
}
