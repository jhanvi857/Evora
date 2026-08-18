package com.evora.client;

import java.util.UUID;

public class JobRequest {
    private String queue = "default";
    private int priority = 5;
    private String payload = "{}";
    private String idempotencyKey = UUID.randomUUID().toString();

    public JobRequest() {}

    public JobRequest(String queue, int priority, String payload, String idempotencyKey) {
        if (queue != null && !queue.isBlank()) this.queue = queue.toLowerCase();
        this.priority = priority;
        if (payload != null) this.payload = payload;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) this.idempotencyKey = idempotencyKey;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getQueue() { return queue; }
    public void setQueue(String queue) { this.queue = queue; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public static class Builder {
        private String queue = "default";
        private int priority = 5;
        private String payload = "{}";
        private String idempotencyKey = UUID.randomUUID().toString();

        public Builder queue(String queue) {
            this.queue = queue;
            return this;
        }

        public Builder priority(int priority) {
            this.priority = priority;
            return this;
        }

        public Builder payload(String payload) {
            this.payload = payload;
            return this;
        }

        public Builder idempotencyKey(String idempotencyKey) {
            this.idempotencyKey = idempotencyKey;
            return this;
        }

        public JobRequest build() {
            return new JobRequest(queue, priority, payload, idempotencyKey);
        }
    }
}
