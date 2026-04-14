package com.evora.api.http;

import com.evora.api.OrderApi;
import com.evora.api.PlaceOrderApiRequest;
import com.evora.application.EvoraRuntime;
// import com.evora.application.EvoraRuntimeConfig;
import io.github.jhanvi857.nioflow.NioFlowApp;
import io.github.jhanvi857.nioflow.plugin.StaticFilesPlugin;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

// import java.util.HashMap;
import java.util.Map;

public class HttpOrderServer {
    private final int port;
    private final OrderApi orderApi;
    private final ObjectMapper objectMapper;

    public HttpOrderServer(int port, OrderApi defaultApi, EvoraRuntime defaultRuntime) {
        this.port = port;
        this.orderApi = defaultApi;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public void start() {
        NioFlowApp app = new NioFlowApp();

        app.get("/api/orders", ctx -> {
            ctx.json(orderApi.listOrders());
        });

        app.get("/api/order/:id/timeline", ctx -> {
            String id = ctx.pathParam("id");
            ctx.json(orderApi.getOrderTimeline(id));
        });

        app.post("/api/order", ctx -> {
            try {
                String bodyString = ctx.bodyAsString();
                @SuppressWarnings("unchecked")
                Map<String, Object> bodyMap = objectMapper.readValue(bodyString, Map.class);
                String scenario = (String) bodyMap.getOrDefault("scenario", "happy");

                PlaceOrderApiRequest rawRequest = objectMapper.readValue(bodyString, PlaceOrderApiRequest.class);
                String enhancedIdempotencyKey = rawRequest.idempotencyKey() + ":scenario:" + scenario;

                PlaceOrderApiRequest request = new PlaceOrderApiRequest(
                        rawRequest.orderId(),
                        rawRequest.customerId(),
                        rawRequest.items(),
                        enhancedIdempotencyKey);

                orderApi.placeOrder(request);
                System.out.println(
                        "[API] Successfully placed order: " + request.orderId() + " (Scenario: " + scenario + ")");
                ctx.status(200).json(Map.of("status", "accepted", "orderId", request.orderId()));
            } catch (Exception e) {
                e.printStackTrace();
                ctx.status(400).json(Map.of("error", "Bad Request", "details", e.getMessage()));
            }
        });

        // Serving static files. Registered LAST to allow specific API routes to match
        // first
        app.register(new StaticFilesPlugin("src/main/resources/static"));

        System.out.println("\n[NioFlow] Evora Dashboard starting on port " + port);
        app.listen(port);
    }
}
