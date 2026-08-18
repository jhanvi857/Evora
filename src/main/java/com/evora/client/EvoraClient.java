package com.evora.client;

import com.evora.domain.Job;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class EvoraClient {
    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public EvoraClient(String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public static EvoraClient create(String baseUrl) {
        return new EvoraClient(baseUrl);
    }

    public Job enqueue(JobRequest request) throws IOException, InterruptedException {
        String jsonPayload = objectMapper.writeValueAsString(Map.of(
                "queue", request.getQueue(),
                "priority", request.getPriority(),
                "payload", request.getPayload(),
                "idempotencyKey", request.getIdempotencyKey()
        ));

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/jobs"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200 || response.statusCode() == 201) {
            String body = response.body();
            if (body.contains("\"already_exists\":true")) {
                Map<String, Object> map = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
                Object jobObj = map.get("job");
                return objectMapper.convertValue(jobObj, Job.class);
            }
            return objectMapper.readValue(body, Job.class);
        } else {
            throw new IOException("Failed to enqueue job. Server responded with status " + response.statusCode() + ": " + response.body());
        }
    }

    public Optional<Job> pollNextJob(String workerId) throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/poll?worker_id=" + workerId;
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            return Optional.of(objectMapper.readValue(response.body(), Job.class));
        } else if (response.statusCode() == 404) {
            return Optional.empty();
        } else {
            throw new IOException("Poll request failed with status " + response.statusCode());
        }
    }

    public boolean heartbeat(String jobId, String workerId) throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/" + jobId + "/heartbeat";
        String body = objectMapper.writeValueAsString(Map.of("worker_id", workerId));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200;
    }

    public boolean complete(String jobId, String workerId) throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/" + jobId + "/complete";
        String body = objectMapper.writeValueAsString(Map.of("worker_id", workerId));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200;
    }

    public boolean fail(String jobId, String workerId, String error) throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/" + jobId + "/fail";
        String body = objectMapper.writeValueAsString(Map.of("worker_id", workerId, "error", error != null ? error : "Unknown error"));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200;
    }

    public boolean cancel(String jobId, String reason) throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/" + jobId + "/cancel";
        String body = objectMapper.writeValueAsString(Map.of("reason", reason != null ? reason : "Cancelled via SDK"));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200;
    }

    public List<Job> getDLQJobs() throws IOException, InterruptedException {
        String url = baseUrl + "/jobs/dlq";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), new TypeReference<List<Job>>() {});
    }

    public List<Job> getAllJobs() throws IOException, InterruptedException {
        String url = baseUrl + "/system/jobs";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), new TypeReference<List<Job>>() {});
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
