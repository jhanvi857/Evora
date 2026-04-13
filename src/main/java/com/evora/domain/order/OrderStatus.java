package com.evora.domain.order;
// enum : fixed set of predefined constants. orders can be only of these values not other.
// have used to avoid typos in string.
public enum OrderStatus {
    PENDING,
    PLACED,
    FAILED,
    CANCELLED,
    CONFIRMED
}
