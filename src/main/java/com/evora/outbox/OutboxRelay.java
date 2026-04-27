package com.evora.outbox;

import com.evora.projection.JobProjector;
import com.evora.shared.DomainEvent;
import com.evora.store.EventJsonSerde;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

public class OutboxRelay implements AutoCloseable {
    private static final String SELECT_UNPUBLISHED_SQL = """
            SELECT id, event_type, payload
            FROM transactional_outbox
            WHERE published = false
            ORDER BY created_at ASC, id ASC
            LIMIT ?
            """;

    private static final String MARK_PUBLISHED_SQL = """
            UPDATE transactional_outbox
            SET published = true
            WHERE id = ?
            """;

    private final DataSource dataSource;
    private final JobProjector projector;
    private final EventJsonSerde serde;
    private final long pollIntervalMs;
    private final AtomicBoolean running;

    private Thread worker;

    public OutboxRelay(DataSource dataSource, JobProjector projector, EventJsonSerde serde, long pollIntervalMs) {
        this.dataSource = dataSource;
        this.projector = projector;
        this.serde = serde;
        this.pollIntervalMs = pollIntervalMs;
        this.running = new AtomicBoolean(false);
    }

    public void start() {
        if (!running.compareAndSet(false, true)) {
            return;
        }

        worker = new Thread(this::runLoop, "evora-outbox-relay");
        worker.setDaemon(true);
        worker.start();
    }

    private void runLoop() {
        while (running.get()) {
            try {
                List<OutboxRow> rows = fetchUnpublishedRows(100);
                for (OutboxRow row : rows) {
                    try {
                        DomainEvent event = serde.deserialize(row.eventType(), row.payload());
                        projector.onEvent(event);
                        markPublished(row.id());
                    } catch (Exception eventFailure) {
                        System.err.println("[OutboxRelay] Failed to process row " + row.id() + ": " + eventFailure.getMessage());
                    }
                }
                Thread.sleep(pollIntervalMs);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception loopFailure) {
                System.err.println("[OutboxRelay] Polling error: " + loopFailure.getMessage());
                try {
                    Thread.sleep(pollIntervalMs);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private List<OutboxRow> fetchUnpublishedRows(int batchSize) throws SQLException {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(SELECT_UNPUBLISHED_SQL)) {
            statement.setInt(1, batchSize);
            try (ResultSet resultSet = statement.executeQuery()) {
                List<OutboxRow> rows = new ArrayList<>();
                while (resultSet.next()) {
                    rows.add(new OutboxRow(
                            resultSet.getObject("id", UUID.class),
                            resultSet.getString("event_type"),
                            resultSet.getString("payload")
                    ));
                }
                return rows;
            }
        }
    }

    private void markPublished(UUID id) throws SQLException {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(MARK_PUBLISHED_SQL)) {
            statement.setObject(1, id);
            statement.executeUpdate();
        }
    }

    @Override
    public void close() {
        running.set(false);
        if (worker != null) {
            worker.interrupt();
        }
    }

    private record OutboxRow(UUID id, String eventType, String payload) {
    }
}
