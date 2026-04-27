package com.evora;

import com.evora.api.OrderApi;
import com.evora.api.SubmitJobApiRequest;
import com.evora.api.http.HttpOrderServer;
import com.evora.application.EvoraRuntime;
import com.evora.application.EvoraRuntimeConfig;
import com.evora.application.SubmitJobRequest;

import java.util.Scanner;
import java.util.UUID;

public class EvoraApplication {
    public static void main(String[] args) {
        EvoraRuntimeConfig config = resolveConfig(scenarioName(args));
        EvoraRuntime runtime = EvoraRuntime.create(config);
        Runtime.getRuntime().addShutdownHook(new Thread(runtime::shutdown));
        OrderApi orderApi = new OrderApi(runtime.commandService(), runtime.queryService(), runtime.timelineService());

        try {
            HttpOrderServer server = new HttpOrderServer(8080, orderApi, runtime);
            new Thread(server::start).start();
        } catch (Exception e) {
            System.err.println("Failed to start dashboard server: " + e.getMessage());
        }

        System.out.println("--- Evora Job Queue CLI Mode ---");
        System.out.println("You can also submit jobs manually here, or use the Dashboard.");

        try (Scanner scanner = new Scanner(System.in)) {
            while (true) {
                System.out.println("\nOptions: [1] Submit Job, [2] Exit");
                String choice = scanner.nextLine();
                if ("2".equals(choice))
                    break;
                if (!"1".equals(choice))
                    continue;

                String jobId = readText(scanner, "Job ID", "job-" + UUID.randomUUID());
                String userId = readText(scanner, "User ID", "user-123");
                String jobType = readText(scanner, "Job Type", "DATA_PROCESSING");
                String priority = readText(scanner, "Priority", "MEDIUM");
                String payload = readText(scanner, "Payload (JSON)", "{\"task\": \"example\"}");
                String idempotencyKey = readText(scanner, "Idempotency Key", "idem-" + UUID.randomUUID());

                SubmitJobRequest request = new SubmitJobRequest(
                        jobId,
                        userId,
                        jobType,
                        priority,
                        payload,
                        idempotencyKey);

                orderApi.submitJob(request);

                System.out.println("Trace for " + jobId + ":");
                orderApi.getJobTimeline(jobId).forEach(event -> System.out.println("- " + event));
            }
        }
    }

    private static EvoraRuntimeConfig resolveConfig(String scenario) {
        return switch (scenario) {
            case "happy" -> EvoraRuntimeConfig.happyPath();
            case "validation-fail" -> EvoraRuntimeConfig.validationFailure();
            case "execution-fail" -> EvoraRuntimeConfig.executionFailure();
            case "notification-fail" -> EvoraRuntimeConfig.notificationFailure();
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
}
