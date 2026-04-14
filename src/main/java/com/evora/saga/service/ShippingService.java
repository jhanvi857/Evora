package com.evora.saga.service;

public interface ShippingService {
    ServiceResult createShipment(String orderId, String idempotencyKey);
}
