package com.evora.saga.service;

import com.evora.domain.order.OrderItem;

import java.util.List;

public interface InventoryService {
    ServiceResult reserve(String orderId, List<OrderItem> items, String idempotencyKey);

    ServiceResult release(String orderId, List<OrderItem> items, String idempotencyKey);
}
