package com.evora.saga.service;

import java.math.BigDecimal;

public interface PaymentService {
    ServiceResult charge(String orderId, BigDecimal amount, String idempotencyKey);

    ServiceResult refund(String orderId, BigDecimal amount, String idempotencyKey);
}
