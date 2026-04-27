package com.evora.saga.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class ExecutionWorker implements ExecutionService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public ExecutionWorker(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult execute(String jobId, String jobType, String payload, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (payload != null && payload.contains("EXECUTION_FAILED")) {
                return ServiceResult.failure("EXECUTION_FAILED: Critical runtime error");
            }
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Random execution failure");
            }
            return ServiceResult.success("exec-" + UUID.randomUUID());
        });
    }

    @Override
    public synchronized ServiceResult rollback(String jobId, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key ->
                ServiceResult.success("exec-roll-" + UUID.randomUUID())
        );
    }
}
