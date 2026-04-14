package com.evora.api;

import com.evora.domain.order.OrderItem;

import java.util.List;

public record PlaceOrderApiRequest(
        String orderId,
        String customerId,
        List<OrderItem> items,
        String idempotencyKey
) {
}
