package com.evora.saga.service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class SimulatedPaymentService implements PaymentService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public SimulatedPaymentService(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult charge(String orderId, BigDecimal amount, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (key.contains(":scenario:payment-fail")) {
                return ServiceResult.failure("[DEMO] Payment declined");
            }
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Payment authorization failed");
            }
            return ServiceResult.success("pay-" + UUID.randomUUID());
        });
    }

    @Override
    public synchronized ServiceResult refund(String orderId, BigDecimal amount, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key ->
                ServiceResult.success("refund-" + UUID.randomUUID())
        );
    }
}
