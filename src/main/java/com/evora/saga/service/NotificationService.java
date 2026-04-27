package com.evora.saga.service;

public interface NotificationService {
    ServiceResult notify(String jobId, String status, String idempotencyKey);
}
