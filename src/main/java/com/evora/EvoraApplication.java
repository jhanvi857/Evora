package com.evora;

import com.evora.api.OrderApi;
import com.evora.api.PlaceOrderApiRequest;
import com.evora.application.EvoraRuntime;
import com.evora.application.EvoraRuntimeConfig;
import com.evora.domain.order.OrderItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class EvoraApplication {
    public static void main(String[] args) {
    EvoraRuntimeConfig config = resolveConfig(args);
    EvoraRuntime runtime = EvoraRuntime.create(config);
    OrderApi orderApi = new OrderApi(runtime.commandService(), runtime.queryService(), runtime.timelineService());

        String orderId = "order-" + UUID.randomUUID();
        String idempotencyKey = "idem-" + UUID.randomUUID();
    PlaceOrderApiRequest request = new PlaceOrderApiRequest(
                orderId,
                "customer-123",
                List.of(
                        new OrderItem("sku-apple", 2, new BigDecimal("120.50")),
                        new OrderItem("sku-banana", 1, new BigDecimal("75.00"))
                ),
                idempotencyKey
        );

        orderApi.placeOrder(request);
        orderApi.placeOrder(request);

        System.out.println("Scenario: " + scenarioName(args));
        System.out.println("Timeline for " + orderId + ":");
        orderApi.getOrderTimeline(orderId).forEach(event -> System.out.println("- " + event));

        orderApi.getOrder(orderId)
                .ifPresent(view -> {
                    System.out.println("\nRead model snapshot:");
                    System.out.println(view);
                });

        System.out.println("\nTotal orders in read model: " + orderApi.listOrders().size());
    }

    private static EvoraRuntimeConfig resolveConfig(String[] args) {
        String scenario = scenarioName(args);
        return switch (scenario) {
            case "happy" -> EvoraRuntimeConfig.happyPath();
            case "inventory-fail" -> EvoraRuntimeConfig.inventoryFailure();
            case "payment-fail" -> EvoraRuntimeConfig.paymentFailure();
            case "shipping-fail" -> EvoraRuntimeConfig.shippingFailure();
            default -> EvoraRuntimeConfig.mixed();
        };
    }

    private static String scenarioName(String[] args) {
        if (args == null || args.length == 0 || args[0] == null || args[0].isBlank()) {
            return "mixed";
        }
        return args[0].trim().toLowerCase();
    }
}