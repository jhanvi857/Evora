package com.evora.projection;

import com.evora.bus.DomainEventSubscriber;
import com.evora.domain.events.JobSubmittedEvent;
import com.evora.domain.events.JobCompletedEvent;
import com.evora.domain.events.JobFailedEvent;
import com.evora.shared.DomainEvent;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.Updates;
import org.bson.Document;

import java.time.Instant;

public class JobProjector implements DomainEventSubscriber {
    private final MongoCollection<Document> queueStats;
    @SuppressWarnings("unused")
    private final MongoCollection<Document> workerHealth;

    public JobProjector(MongoClient mongoClient) {
        MongoDatabase db = mongoClient.getDatabase("evora");
        this.queueStats = db.getCollection("queue_stats");
        this.workerHealth = db.getCollection("worker_health");
    }

    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof JobSubmittedEvent e) {
            queueStats.updateOne(
                    Filters.eq("queue", e.job().getQueue()),
                    Updates.combine(
                            Updates.inc("pending_count", 1),
                            Updates.set("updated_at", Instant.now().toString())),
                    new UpdateOptions().upsert(true));
        } else if (event instanceof JobCompletedEvent e) {
            queueStats.updateOne(
                    Filters.eq("queue", e.queue()),
                    Updates.combine(
                            Updates.inc("completed_last_1h", 1),
                            Updates.inc("pending_count", -1),
                            Updates.set("updated_at", Instant.now().toString())),
                    new UpdateOptions().upsert(true));
        } else if (event instanceof JobFailedEvent e) {
            queueStats.updateOne(
                    Filters.eq("queue", e.queue()),
                    Updates.combine(
                            Updates.inc("failed_count", 1),
                            Updates.inc("pending_count", -1),
                            Updates.set("updated_at", Instant.now().toString())),
                    new UpdateOptions().upsert(true));
        }
    }
}
