package com.evora.store;

import com.evora.domain.order.JobAggregate;
import com.evora.eventstore.EventStore;
import com.evora.eventstore.OptimisticConcurrencyException;
import com.evora.shared.DomainEvent;
import org.postgresql.util.PGobject;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class PostgresEventStore implements EventStore {
    private static final String LOAD_BY_AGGREGATE_SQL = """
            SELECT event_type, payload
            FROM events
            WHERE aggregate_id = ?
            ORDER BY version ASC
            """;

    private static final String LOAD_ALL_SQL = """
            SELECT event_type, payload
            FROM events
            ORDER BY created_at ASC, id ASC
            """;

    private static final String CURRENT_VERSION_SQL = """
            SELECT COALESCE(MAX(version), 0) AS current_version
            FROM events
            WHERE aggregate_id = ?
            """;

    private static final String INSERT_EVENT_SQL = """
            INSERT INTO events (id, aggregate_id, event_type, payload, version, idempotency_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String INSERT_OUTBOX_SQL = """
            INSERT INTO transactional_outbox (id, aggregate_id, event_type, payload, published, created_at)
            VALUES (?, ?, ?, ?, false, ?)
            """;

    private static final String UPSERT_SNAPSHOT_SQL = """
            INSERT INTO snapshots (aggregate_id, version, payload, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (aggregate_id)
            DO UPDATE SET version = EXCLUDED.version, payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
            """;

    private final DataSource dataSource;
    private final EventJsonSerde serde;

    public PostgresEventStore(DataSource dataSource, EventJsonSerde serde) {
        this.dataSource = dataSource;
        this.serde = serde;
    }

    @Override
    public List<DomainEvent> load(String aggregateId) {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(LOAD_BY_AGGREGATE_SQL)) {
            statement.setString(1, aggregateId);
            try (ResultSet resultSet = statement.executeQuery()) {
                List<DomainEvent> events = new ArrayList<>();
                while (resultSet.next()) {
                    events.add(serde.deserialize(
                            resultSet.getString("event_type"),
                            resultSet.getString("payload")
                    ));
                }
                return events;
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to load events for aggregate " + aggregateId, e);
        }
    }

    @Override
    public List<DomainEvent> loadAllEvents() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(LOAD_ALL_SQL)) {
            List<DomainEvent> events = new ArrayList<>();
            while (resultSet.next()) {
                events.add(serde.deserialize(
                        resultSet.getString("event_type"),
                        resultSet.getString("payload")
                ));
            }
            return events;
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to load all events", e);
        }
    }

    @Override
    public void append(String aggregateId, int expectedVersion, List<DomainEvent> newEvents) {
        if (newEvents == null || newEvents.isEmpty()) {
            return;
        }

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                int currentVersion = currentVersion(connection, aggregateId);
                if (currentVersion != expectedVersion) {
                    throw new OptimisticConcurrencyException(
                            "Version conflict for aggregate " + aggregateId + ": expected "
                                    + expectedVersion + " but was " + currentVersion
                    );
                }

                List<DomainEvent> existingEvents = loadWithinTransaction(connection, aggregateId);

                for (DomainEvent event : newEvents) {
                    insertEvent(connection, aggregateId, event);
                    insertOutbox(connection, aggregateId, event);
                }

                List<DomainEvent> merged = new ArrayList<>(existingEvents.size() + newEvents.size());
                merged.addAll(existingEvents);
                merged.addAll(newEvents);
                DomainEvent latestEvent = newEvents.get(newEvents.size() - 1);
                upsertSnapshot(connection, aggregateId, latestEvent.version(), buildSnapshotPayload(merged), latestEvent.occurredAt());

                connection.commit();
            } catch (Exception e) {
                connection.rollback();
                if (e instanceof RuntimeException runtimeException) {
                    throw runtimeException;
                }
                throw new IllegalStateException("Failed to append events for aggregate " + aggregateId, e);
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to append events for aggregate " + aggregateId, e);
        }
    }

    private int currentVersion(Connection connection, String aggregateId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(CURRENT_VERSION_SQL)) {
            statement.setString(1, aggregateId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getInt("current_version");
                }
                return 0;
            }
        }
    }

    private List<DomainEvent> loadWithinTransaction(Connection connection, String aggregateId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(LOAD_BY_AGGREGATE_SQL)) {
            statement.setString(1, aggregateId);
            try (ResultSet resultSet = statement.executeQuery()) {
                List<DomainEvent> events = new ArrayList<>();
                while (resultSet.next()) {
                    events.add(serde.deserialize(
                            resultSet.getString("event_type"),
                            resultSet.getString("payload")
                    ));
                }
                return events;
            }
        }
    }

    private void insertEvent(Connection connection, String aggregateId, DomainEvent event) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSERT_EVENT_SQL)) {
            statement.setObject(1, UUID.randomUUID());
            statement.setString(2, aggregateId);
            statement.setString(3, serde.eventType(event));
            statement.setObject(4, toJsonb(serde.serialize(event)));
            statement.setInt(5, event.version());
            statement.setString(6, extractIdempotencyKey(event));
            statement.setTimestamp(7, Timestamp.from(event.occurredAt()));
            statement.executeUpdate();
        }
    }

    private void insertOutbox(Connection connection, String aggregateId, DomainEvent event) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSERT_OUTBOX_SQL)) {
            statement.setObject(1, UUID.randomUUID());
            statement.setString(2, aggregateId);
            statement.setString(3, serde.eventType(event));
            statement.setObject(4, toJsonb(serde.serialize(event)));
            statement.setTimestamp(5, Timestamp.from(event.occurredAt()));
            statement.executeUpdate();
        }
    }

    private void upsertSnapshot(Connection connection, String aggregateId, int version, Map<String, Object> payload, Instant updatedAt)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(UPSERT_SNAPSHOT_SQL)) {
            statement.setString(1, aggregateId);
            statement.setInt(2, version);
            statement.setObject(3, toJsonb(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload)));
            statement.setTimestamp(4, Timestamp.from(updatedAt));
            statement.executeUpdate();
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new SQLException("Failed to serialize snapshot payload", e);
        }
    }

    private Map<String, Object> buildSnapshotPayload(List<DomainEvent> history) {
        JobAggregate aggregate = JobAggregate.rehydrate(history);
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("jobId", aggregate.jobId());
        snapshot.put("version", aggregate.version());
        snapshot.put("userId", aggregate.userId());
        snapshot.put("jobType", aggregate.jobType());
        snapshot.put("priority", aggregate.priority());
        snapshot.put("status", aggregate.status().name());
        snapshot.put("failureReason", aggregate.failureReason());
        snapshot.put("payload", aggregate.payload());
        return snapshot;
    }

    private String extractIdempotencyKey(DomainEvent event) {
        try {
            Object value = event.getClass().getMethod("idempotencyKey").invoke(event);
            return value == null ? null : value.toString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private PGobject toJsonb(String json) throws SQLException {
        PGobject pgObject = new PGobject();
        pgObject.setType("jsonb");
        pgObject.setValue(json);
        return pgObject;
    }
}
