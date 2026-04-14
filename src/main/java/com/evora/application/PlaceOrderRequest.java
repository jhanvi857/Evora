package com.evora.application;

import com.evora.domain.order.OrderItem;

import java.util.List;

public record PlaceOrderRequest(String orderId, String customerId, List<OrderItem> items, String idempotencyKey) {
	public PlaceOrderRequest {
		if (orderId == null || orderId.isBlank()) {
			throw new IllegalArgumentException("orderId is required");
		}
		if (customerId == null || customerId.isBlank()) {
			throw new IllegalArgumentException("customerId is required");
		}
		if (idempotencyKey == null || idempotencyKey.isBlank()) {
			throw new IllegalArgumentException("idempotencyKey is required");
		}
		if (items == null || items.isEmpty()) {
			throw new IllegalArgumentException("items must contain at least one item");
		}
		items = List.copyOf(items);
	}
}
