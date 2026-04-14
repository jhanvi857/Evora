package com.evora.application;

import com.evora.projection.InMemoryOrderViewRepository;
import com.evora.projection.OrderView;

import java.util.List;
import java.util.Optional;

public class OrderQueryService {
    private final InMemoryOrderViewRepository repository;

    public OrderQueryService(InMemoryOrderViewRepository repository) {
        this.repository = repository;
    }

    public Optional<OrderView> getOrderById(String orderId) {
        return repository.findByOrderId(orderId);
    }

    public List<OrderView> listOrders() {
        return repository.findAll();
    }
}
