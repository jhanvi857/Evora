package com.evora.projection;

import com.evora.domain.order.OrderItem;
import com.evora.domain.order.OrderStatus;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.ReplaceOptions;
import org.bson.Document;
import org.bson.types.Decimal128;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;

public class MongoOrderViewRepository implements OrderViewRepository {
    private final MongoCollection<Document> collection;

    public MongoOrderViewRepository(MongoDatabase database, String collectionName) {
        this.collection = database.getCollection(collectionName);
    }

    @Override
    public void save(OrderView orderView) {
        Document document = toDocument(orderView);
        collection.replaceOne(eq("_id", orderView.orderId()), document, new ReplaceOptions().upsert(true));
    }

    @Override
    public Optional<OrderView> findByOrderId(String orderId) {
        Document document = collection.find(eq("_id", orderId)).first();
        return Optional.ofNullable(document).map(this::fromDocument);
    }

    @Override
    public List<OrderView> findAll() {
        List<OrderView> result = new ArrayList<>();
        for (Document document : collection.find()) {
            result.add(fromDocument(document));
        }
        return result;
    }

    @Override
    public void clearAll() {
        collection.deleteMany(new Document());
    }

    private Document toDocument(OrderView view) {
        List<Document> itemDocuments = view.items().stream()
                .map(item -> new Document("sku", item.sku())
                        .append("quantity", item.quantity())
                        .append("unitPrice", new Decimal128(item.unitPrice()))
                        .append("lineTotal", new Decimal128(item.lineTotal())))
                .toList();

        List<Document> timelineDocuments = view.timeline().stream()
                .map(entry -> new Document("eventType", entry.eventType())
                        .append("version", entry.version())
                        .append("occurredAt", Date.from(entry.occurredAt()))
                        .append("payload", new Document(entry.payload())))
                .toList();

        return new Document("_id", view.orderId())
                .append("orderId", view.orderId())
                .append("customer", new Document("customerId", view.customerId()))
                .append("items", itemDocuments)
                .append("totalAmount", new Decimal128(view.totalAmount()))
                .append("status", view.status().name())
                .append("sagaStep", view.sagaStep())
                .append("failureReason", view.failureReason())
                .append("updatedAt", Date.from(view.updatedAt()))
                .append("timeline", timelineDocuments);
    }

    @SuppressWarnings("unchecked")
    private OrderView fromDocument(Document document) {
        Document customer = document.get("customer", Document.class);
        List<Document> itemDocuments = (List<Document>) document.getOrDefault("items", List.of());
        List<OrderItem> items = itemDocuments.stream()
                .map(itemDoc -> new OrderItem(
                        itemDoc.getString("sku"),
                        itemDoc.getInteger("quantity", 0),
                        decimalToBigDecimal(itemDoc.get("unitPrice"))))
                .toList();

        List<Document> timelineDocuments = (List<Document>) document.getOrDefault("timeline", List.of());
        List<OrderTimelineEntry> timeline = timelineDocuments.stream()
                .map(timelineDoc -> {
                    Date occurredAt = timelineDoc.getDate("occurredAt");
                    Document payloadDoc = timelineDoc.get("payload", Document.class);
                    Map<String, Object> payload = payloadDoc == null
                            ? Map.of()
                            : new LinkedHashMap<>(payloadDoc);
                    return new OrderTimelineEntry(
                            timelineDoc.getString("eventType"),
                            timelineDoc.getInteger("version", 0),
                            occurredAt == null ? Instant.now() : occurredAt.toInstant(),
                            payload
                    );
                })
                .toList();

        Date updatedAt = document.getDate("updatedAt");
        return new OrderView(
                document.getString("orderId"),
                customer == null ? null : customer.getString("customerId"),
                items,
                decimalToBigDecimal(document.get("totalAmount")),
                OrderStatus.valueOf(document.getString("status")),
                document.getString("sagaStep"),
                document.getString("failureReason"),
                updatedAt == null ? Instant.now() : updatedAt.toInstant(),
                timeline
        );
    }

    private BigDecimal decimalToBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof Decimal128 decimal128) {
            return decimal128.bigDecimalValue();
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }
}
