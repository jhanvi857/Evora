package com.evora.saga.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class SimulatedShippingService implements ShippingService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public SimulatedShippingService(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult createShipment(String orderId, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (key.contains(":scenario:shipping-fail")) {
                return ServiceResult.failure("[DEMO] Shipping restricted to this area");
            }
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Shipping failed");
            }
            return ServiceResult.success("ship-cre-" + UUID.randomUUID());
        });
    }
}
