package com.evora.application;

public record EvoraRuntimeConfig(
        long inventorySeed,
        double inventoryFailureRate,
        long paymentSeed,
        double paymentFailureRate,
        long shippingSeed,
        double shippingFailureRate
) {
    public static EvoraRuntimeConfig happyPath() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 0.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig mixed() {
        return new EvoraRuntimeConfig(10L, 0.05d, 20L, 0.08d, 30L, 0.05d);
    }

    public static EvoraRuntimeConfig inventoryFailure() {
        return new EvoraRuntimeConfig(10L, 1.0d, 20L, 0.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig paymentFailure() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 1.0d, 30L, 0.0d);
    }

    public static EvoraRuntimeConfig shippingFailure() {
        return new EvoraRuntimeConfig(10L, 0.0d, 20L, 0.0d, 30L, 1.0d);
    }
}
