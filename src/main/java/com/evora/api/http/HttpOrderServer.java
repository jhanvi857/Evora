package com.evora.api.http;

import com.evora.api.OrderApi;
import com.evora.api.SubmitJobApiRequest;
import com.evora.application.EvoraRuntime;
import com.evora.application.SubmitJobRequest;
import io.github.jhanvi857.nioflow.NioFlowApp;
import io.github.jhanvi857.nioflow.plugin.StaticFilesPlugin;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.Map;

public class HttpOrderServer {
    private final int port;
    private final OrderApi orderApi;
    private final EvoraRuntime runtime;
    private final ObjectMapper objectMapper;

    public HttpOrderServer(int port, OrderApi defaultApi, EvoraRuntime defaultRuntime) {
        this.port = port;
        this.orderApi = defaultApi;
        this.runtime = defaultRuntime;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public void start() {
        NioFlowApp app = new NioFlowApp();

        app.get("/api/jobs", ctx -> {
            String status = ctx.query("status");
            ctx.json(orderApi.listJobs(status));
        });

        app.get("/api/jobs/stats", ctx -> {
            ctx.json(orderApi.getStats());
        });

        app.get("/api/jobs/:id", ctx -> {
            String id = ctx.pathParam("id");
            orderApi.getJob(id)
                .ifPresentOrElse(ctx::json, () -> ctx.status(404).json(Map.of("error", "Job not found")));
        });

        app.get("/api/jobs/:id/timeline", ctx -> {
            String id = ctx.pathParam("id");
            ctx.json(orderApi.getJobTimeline(id));
        });

        app.post("/api/jobs", ctx -> {
            try {
                String bodyString = ctx.bodyAsString();
                @SuppressWarnings("unchecked")
                Map<String, Object> bodyMap = objectMapper.readValue(bodyString, Map.class);
                String scenario = (String) bodyMap.getOrDefault("scenario", "happy");

                SubmitJobApiRequest rawRequest = objectMapper.readValue(bodyString, SubmitJobApiRequest.class);
                String enhancedIdempotencyKey = rawRequest.idempotencyKey() + ":scenario:" + scenario;

                SubmitJobRequest request = new SubmitJobRequest(
                        rawRequest.jobId(),
                        rawRequest.userId(),
                        rawRequest.jobType(),
                        rawRequest.priority(),
                        rawRequest.payload(),
                        enhancedIdempotencyKey);

                orderApi.submitJob(request);
                System.out.println(
                        "[API] Successfully submitted job: " + request.jobId() + " (Scenario: " + scenario + ")");
                ctx.status(200).json(Map.of("status", "accepted", "jobId", request.jobId()));
            } catch (Exception e) {
                e.printStackTrace();
                ctx.status(400).json(Map.of("error", "Bad Request", "details", e.getMessage()));
            }
        });

        app.post("/admin/replay", ctx -> {
            try {
                int eventsReplayed = runtime.replayService().replayAll();
                ctx.status(200).json(Map.of(
                        "status", "ok",
                        "eventsReplayed", eventsReplayed
                ));
            } catch (Exception replayFailure) {
                ctx.status(500).json(Map.of(
                        "status", "error",
                        "message", replayFailure.getMessage()
                ));
            }
        });

        app.register(new StaticFilesPlugin("src/main/resources/static"));

        System.out.println("\n[NioFlow] Evora Job Queue Portal starting on port " + port);
        app.listen(port);
    }
}
