package com.evora.application;

import com.evora.projection.OrderView;
import com.evora.projection.OrderViewRepository;

import java.util.List;
import java.util.Optional;

public class OrderQueryService {
    private final OrderViewRepository repository;

    public OrderQueryService(OrderViewRepository repository) {
        this.repository = repository;
    }

    public Optional<OrderView> getOrderById(String orderId) {
        return repository.findByOrderId(orderId);
    }

    public List<OrderView> listOrders() {
        return repository.findAll();
    }
}
