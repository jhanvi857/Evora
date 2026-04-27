package com.evora.saga.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class ValidationWorker implements ValidationService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public ValidationWorker(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult validate(String jobId, String jobType, String payload, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (payload != null && payload.contains("VALIDATION_FAILED")) {
                return ServiceResult.failure("VALIDATION_FAILED: Invalid job payload");
            }
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Random validation failure");
            }
            return ServiceResult.success("val-" + UUID.randomUUID());
        });
    }

    @Override
    public synchronized ServiceResult releaseResources(String jobId, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key ->
                ServiceResult.success("val-rel-" + UUID.randomUUID())
        );
    }
}
