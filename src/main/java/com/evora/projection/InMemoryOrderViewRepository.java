package com.evora.projection;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;

public class InMemoryOrderViewRepository {
    private final Map<String, OrderView> views = new ConcurrentHashMap<>();

    public void save(OrderView orderView) {
        views.put(orderView.orderId(), orderView);
    }

    public Optional<OrderView> findByOrderId(String orderId) {
        return Optional.ofNullable(views.get(orderId));
    }

    public List<OrderView> findAll() {
        return views.values().stream().toList();
    }
}
