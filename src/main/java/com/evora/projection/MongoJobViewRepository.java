package com.evora.projection;

import com.evora.domain.order.JobStatus;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.ReplaceOptions;
import org.bson.Document;

import java.time.Instant;
import java.util.*;

import static com.mongodb.client.model.Filters.eq;

public class MongoJobViewRepository implements JobViewRepository {
    private final MongoCollection<Document> collection;

    public MongoJobViewRepository(MongoDatabase database, String collectionName) {
        this.collection = database.getCollection(collectionName);
    }

    @Override
    public void save(JobView view) {
        Document document = toDocument(view);
        collection.replaceOne(eq("_id", view.jobId()), document, new ReplaceOptions().upsert(true));
    }

    @Override
    public Optional<JobView> findByJobId(String jobId) {
        Document document = collection.find(eq("_id", jobId)).first();
        return Optional.ofNullable(document).map(this::fromDocument);
    }

    @Override
    public List<JobView> findAll() {
        List<JobView> result = new ArrayList<>();
        for (Document document : collection.find()) {
            result.add(fromDocument(document));
        }
        return result;
    }

    @Override
    public void clearAll() {
        collection.deleteMany(new org.bson.Document());
    }

    @Override
    public List<JobView> findByStatus(JobStatus status) {
        List<JobView> result = new ArrayList<>();
        for (Document document : collection.find(eq("status", status.name()))) {
            result.add(fromDocument(document));
        }
        return result;
    }

    @Override
    public long count() {
        return collection.countDocuments();
    }

    @Override
    public long countByStatus(JobStatus status) {
        return collection.countDocuments(eq("status", status.name()));
    }

    private Document toDocument(JobView view) {
        List<Document> timelineDocuments = view.timeline().stream()
                .map(entry -> new Document("eventType", entry.eventType())
                        .append("version", entry.version())
                        .append("occurredAt", Date.from(entry.occurredAt()))
                        .append("payload", new Document(entry.payload())))
                .toList();

        return new Document("_id", view.jobId())
                .append("jobId", view.jobId())
                .append("userId", view.userId())
                .append("jobType", view.jobType())
                .append("priority", view.priority())
                .append("payload", view.payload())
                .append("status", view.status().name())
                .append("currentStep", view.currentStep())
                .append("failureReason", view.failureReason())
                .append("updatedAt", Date.from(view.updatedAt()))
                .append("timeline", timelineDocuments);
    }

    @SuppressWarnings("unchecked")
    private JobView fromDocument(Document document) {
        List<Document> timelineDocuments = (List<Document>) document.getOrDefault("timeline", List.of());
        List<JobTimelineEntry> timeline = timelineDocuments.stream()
                .map(timelineDoc -> {
                    Date occurredAt = timelineDoc.getDate("occurredAt");
                    Document payloadDoc = timelineDoc.get("payload", Document.class);
                    Map<String, Object> payload = payloadDoc == null ? Map.of() : new LinkedHashMap<>(payloadDoc);
                    return new JobTimelineEntry(
                            timelineDoc.getString("eventType"),
                            timelineDoc.getInteger("version", 0),
                            occurredAt == null ? Instant.now() : occurredAt.toInstant(),
                            payload
                    );
                })
                .toList();

        Date updatedAt = document.getDate("updatedAt");
        return new JobView(
                document.getString("jobId"),
                document.getString("userId"),
                document.getString("jobType"),
                document.getString("priority"),
                document.getString("payload"),
                JobStatus.valueOf(document.getString("status")),
                document.getString("currentStep"),
                document.getString("failureReason"),
                updatedAt == null ? Instant.now() : updatedAt.toInstant(),
                timeline
        );
    }
}
