package com.evora.saga.service;

import com.evora.domain.order.OrderItem;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class SimulatedInventoryService implements InventoryService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public SimulatedInventoryService(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult reserve(String orderId, List<OrderItem> items, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Inventory not available");
            }
            return ServiceResult.success("inv-res-" + UUID.randomUUID());
        });
    }

    @Override
    public synchronized ServiceResult release(String orderId, List<OrderItem> items, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key ->
                ServiceResult.success("inv-rel-" + UUID.randomUUID())
        );
    }
}
