package com.evora.saga.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class NotificationWorker implements NotificationService {
    private final Random random;
    private final double failureRate;
    private final Map<String, ServiceResult> responsesByKey = new HashMap<>();

    public NotificationWorker(long seed, double failureRate) {
        this.random = new Random(seed);
        this.failureRate = failureRate;
    }

    @Override
    public synchronized ServiceResult notify(String jobId, String status, String idempotencyKey) {
        return responsesByKey.computeIfAbsent(idempotencyKey, key -> {
            if (idempotencyKey != null && idempotencyKey.contains("NOTIFICATION_FAILED")) {
                return ServiceResult.failure("NOTIFICATION_FAILED: Gateway timeout");
            }
            if (random.nextDouble() < failureRate) {
                return ServiceResult.failure("Random notification failure");
            }
            return ServiceResult.success("notif-" + UUID.randomUUID());
        });
    }
}
