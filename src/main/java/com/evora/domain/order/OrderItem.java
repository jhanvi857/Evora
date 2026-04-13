package com.evora.domain.order;

import java.math.BigDecimal;
// record : special type of class for immutable data in which we don't have to manually define class, methods etc and it's immutable so no tension of changing values.
public record OrderItem(String sku, int quantity, BigDecimal unitPrice) {
    public OrderItem {
        if (sku == null || sku.isBlank()) {
            throw new IllegalArgumentException("sku is required");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be greater than zero");
        }
        if (unitPrice == null || unitPrice.signum() <= 0) {
            throw new IllegalArgumentException("unitPrice must be greater than zero");
        }
    }

    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
