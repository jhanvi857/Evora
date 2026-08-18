package com.evora.demo;

import com.evora.client.EvoraClient;
import com.evora.client.EvoraWorker;
import com.evora.client.JobRequest;
import com.evora.client.JobResult;
import com.evora.domain.Job;

import java.util.UUID;

/**
 * Example demonstration showing how external microservices and applications
 * integrate with Evora Job Queue using the Evora Client SDK.
 */
public class EvoraWorkerDemo {
    public static void main(String[] args) throws Exception {
        System.out.println("=================================================");
        System.out.println("   Evora Distributed Job Queue - SDK Demo        ");
        System.out.println("=================================================");

        String serverUrl = System.getenv().getOrDefault("EVORA_SERVER_URL", "http://localhost:8080");
        System.out.println("Connecting SDK to Evora server at: " + serverUrl);

        // 1. Initialize Evora Client
        EvoraClient client = EvoraClient.create(serverUrl);

        // 2. Start a background worker using EvoraWorker
        EvoraWorker worker = EvoraWorker.builder()
                .client(client)
                .workerId("payment-worker-node-1")
                .queue("critical")
                .concurrency(2)
                .pollIntervalMs(300)
                .handler((Job job) -> {
                    System.out.println("\n[Worker Processing] Claimed Job ID: " + job.getId());
                    System.out.println("[Worker Processing] Priority: " + job.getPriority());
                    System.out.println("[Worker Processing] Payload: " + job.getPayload());

                    // Simulate task execution
                    Thread.sleep(1000);

                    if (job.getPayload() != null && job.getPayload().contains("FAIL_SIMULATION")) {
                        return JobResult.failure("Simulated worker processing error");
                    }

                    return JobResult.success();
                })
                .build();

        worker.start();
        System.out.println("[SDK Demo] Worker node started listening for critical lane jobs...");

        // 3. Enqueue sample jobs using EvoraClient
        System.out.println("\n[SDK Demo] Enqueuing sample jobs...");

        JobRequest job1 = JobRequest.builder()
                .queue("critical")
                .priority(1)
                .idempotencyKey("PAYMENT-" + UUID.randomUUID().toString().substring(0, 8))
                .payload("{\"action\": \"CHARGE_CARD\", \"amount\": 299.99, \"currency\": \"USD\"}")
                .build();

        Job responseJob1 = client.enqueue(job1);
        System.out.println("[SDK Demo] Enqueued Job 1: ID=" + responseJob1.getId() + " Status=" + responseJob1.getStatus());

        JobRequest job2 = JobRequest.builder()
                .queue("critical")
                .priority(1)
                .idempotencyKey("PAYMENT-" + UUID.randomUUID().toString().substring(0, 8))
                .payload("{\"action\": \"GENERATE_INVOICE\", \"order_id\": \"ORD-8812\"}")
                .build();

        Job responseJob2 = client.enqueue(job2);
        System.out.println("[SDK Demo] Enqueued Job 2: ID=" + responseJob2.getId() + " Status=" + responseJob2.getStatus());

        // Wait for worker to finish processing
        Thread.sleep(4000);

        // Clean shutdown
        worker.stop();
        System.out.println("\n[SDK Demo] Completed demo run successfully.");
    }
}
