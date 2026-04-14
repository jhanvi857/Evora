package com.evora;

import com.evora.api.OrderApi;
import com.evora.api.PlaceOrderApiRequest;
import com.evora.api.http.HttpOrderServer;
import com.evora.application.EvoraRuntime;
import com.evora.application.EvoraRuntimeConfig;
import com.evora.domain.order.OrderItem;

// import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import java.util.UUID;

public class EvoraApplication {
    public static void main(String[] args) {
        EvoraRuntimeConfig config = resolveConfig(scenarioName(args));
        EvoraRuntime runtime = EvoraRuntime.create(config);
        OrderApi orderApi = new OrderApi(runtime.commandService(), runtime.queryService(), runtime.timelineService());

        try {
            HttpOrderServer server = new HttpOrderServer(8080, orderApi, runtime);
            new Thread(server::start).start();
        } catch (Exception e) {
            System.err.println("Failed to start dashboard server: " + e.getMessage());
        }

        System.out.println("--- Evora CQRS CLI Mode ---");
        System.out.println("You can also enter orders manually here, or use the Dashboard.");

        try (Scanner scanner = new Scanner(System.in)) {
            while (true) {
                System.out.println("\nOptions: [1] Manual Order, [2] Exit");
                String choice = scanner.nextLine();
                if ("2".equals(choice))
                    break;
                if (!"1".equals(choice))
                    continue;

                String orderId = readText(scanner, "Order ID", "order-" + UUID.randomUUID());
                String customerId = readText(scanner, "Customer ID", "customer-123");
                String idempotencyKey = readText(scanner, "Idempotency Key", "idem-" + UUID.randomUUID());
                List<OrderItem> items = readOrderItems(scanner);

                PlaceOrderApiRequest request = new PlaceOrderApiRequest(
                        orderId,
                        customerId,
                        items,
                        idempotencyKey);

                orderApi.placeOrder(request);

                System.out.println("Timeline for " + orderId + ":");
                orderApi.getOrderTimeline(orderId).forEach(event -> System.out.println("- " + event));
            }
        }
    }

    private static EvoraRuntimeConfig resolveConfig(String scenario) {
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

    private static String readText(Scanner scanner, String label, String defaultValue) {
        while (true) {
            System.out.printf("%s [%s]: ", label, defaultValue);
            String input = scanner.nextLine();
            if (input == null || input.isBlank()) {
                return defaultValue;
            }
            String value = input.trim();
            if (!value.isEmpty()) {
                return value;
            }
        }
    }

    private static List<OrderItem> readOrderItems(Scanner scanner) {
        int count = readPositiveInt(scanner, "Number of items", 2);
        List<OrderItem> items = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            String sku = readText(scanner, "Item " + i + " SKU", "sku-item-" + i);
            int quantity = readPositiveInt(scanner, "Item " + i + " quantity", 1);
            BigDecimal unitPrice = readPositiveDecimal(scanner, "Item " + i + " unit price", "100.00");
            items.add(new OrderItem(sku, quantity, unitPrice));
        }
        return items;
    }

    private static int readPositiveInt(Scanner scanner, String label, int defaultValue) {
        while (true) {
            System.out.printf("%s [%d]: ", label, defaultValue);
            String input = scanner.nextLine();
            if (input == null || input.isBlank()) {
                return defaultValue;
            }
            try {
                int value = Integer.parseInt(input.trim());
                if (value > 0) {
                    return value;
                }
            } catch (NumberFormatException ignored) {
                // continue prompting
            }
            System.out.println("Please enter a positive integer.");
        }
    }

    private static BigDecimal readPositiveDecimal(Scanner scanner, String label, String defaultValue) {
        while (true) {
            System.out.printf("%s [%s]: ", label, defaultValue);
            String input = scanner.nextLine();
            String candidate = (input == null || input.isBlank()) ? defaultValue : input.trim();
            try {
                BigDecimal value = new BigDecimal(candidate);
                if (value.compareTo(BigDecimal.ZERO) > 0) {
                    return value;
                }
            } catch (NumberFormatException ignored) {
                // continue prompting
            }
            System.out.println("Please enter a positive decimal value.");
        }
    }
}
