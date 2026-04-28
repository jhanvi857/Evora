package com.evora.store;

import com.evora.domain.Job;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;

public class PostgresJobStore {
    private final DataSource dataSource;
    private final ObjectMapper objectMapper;

    @SuppressWarnings("resource")
    public PostgresJobStore(DataSource dataSource) {
        this.dataSource = dataSource;
        this.objectMapper = new ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        try (Connection conn = dataSource.getConnection();
                java.sql.Statement stmt = conn.createStatement()) {
            java.io.InputStream stream = getClass().getResourceAsStream("/schema.sql");
            if (stream == null) {
                stream = new java.io.FileInputStream("src/main/resources/schema.sql");
            }
            java.util.Scanner s = new java.util.Scanner(stream, "UTF-8").useDelimiter(";");
            while (s.hasNext()) {
                String sql = s.next().trim();
                if (!sql.isEmpty())
                    stmt.execute(sql);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public Optional<Job> claimNextJob(String workerId, String queue, int visibilitySeconds) {
        String sql = """
                UPDATE jobs
                SET status        = 'RUNNING',
                    worker_id     = ?,
                    locked_until  = NOW() + (? || ' seconds')::INTERVAL,
                    attempt_count = attempt_count + 1
                WHERE id = (
                    SELECT id FROM jobs
                    WHERE status       = 'PENDING'
                      AND queue        = ?
                      AND scheduled_at <= NOW()
                    ORDER BY priority ASC, scheduled_at ASC
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                RETURNING *
                """;
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, workerId);
            stmt.setInt(2, visibilitySeconds);
            stmt.setString(3, queue);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next())
                    return Optional.of(mapJob(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to claim job", e);
        }
        return Optional.empty();
    }

    public Optional<Job> findByIdempotencyKey(String key) {
        String sql = "SELECT * FROM jobs WHERE idempotency_key = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, key);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next())
                    return Optional.of(mapJob(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find job", e);
        }
        return Optional.empty();
    }

    public Optional<Job> findById(UUID jobId) {
        String sql = "SELECT * FROM jobs WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next())
                    return Optional.of(mapJob(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find job", e);
        }
        return Optional.empty();
    }

    public Job insertJob(Job job) {
        String sql = """
                INSERT INTO jobs (id, idempotency_key, queue, priority, payload, status, attempt_count, max_attempts, scheduled_at, created_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?)
                """;
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, job.getId());
            stmt.setString(2, job.getIdempotencyKey());
            stmt.setString(3, job.getQueue());
            stmt.setInt(4, job.getPriority());
            stmt.setString(5, job.getPayload());
            stmt.setString(6, job.getStatus().name());
            stmt.setInt(7, job.getAttemptCount());
            stmt.setInt(8, job.getMaxAttempts());
            stmt.setTimestamp(9, Timestamp.from(job.getScheduledAt()));
            stmt.setTimestamp(10, Timestamp.from(job.getCreatedAt()));
            stmt.executeUpdate();
            return job;
        } catch (SQLException e) {
            throw new RuntimeException("Failed to insert job", e);
        }
    }

    public boolean extendLock(UUID jobId, String workerId, int visibilitySeconds) {
        String sql = """
                UPDATE jobs
                SET locked_until = NOW() + (? || ' seconds')::INTERVAL
                WHERE id = ? AND worker_id = ? AND status = 'RUNNING'
                """;
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, visibilitySeconds);
            stmt.setObject(2, jobId);
            stmt.setString(3, workerId);
            return stmt.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new RuntimeException("Failed to extend lock", e);
        }
    }

    public void completeJob(UUID jobId, String workerId) {
        String sql = "UPDATE jobs SET status = 'COMPLETED', completed_at = NOW() WHERE id = ? AND worker_id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            stmt.setString(2, workerId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to complete job", e);
        }
    }

    public void failJob(UUID jobId, String workerId, String error) {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try {
                Job job = findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));
                if (job.getAttemptCount() >= job.getMaxAttempts()) {
                    String sql = "UPDATE jobs SET status = 'DLQ', last_error = ? WHERE id = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, error);
                        stmt.setObject(2, jobId);
                        stmt.executeUpdate();
                    }
                } else {
                    String sql = "UPDATE jobs SET status = 'PENDING', worker_id = NULL, locked_until = NULL, last_error = ? WHERE id = ?";
                    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                        stmt.setString(1, error);
                        stmt.setObject(2, jobId);
                        stmt.executeUpdate();
                    }
                }
                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fail job", e);
        }
    }

    public List<Job> findExpiredLocks() {
        String sql = "SELECT * FROM jobs WHERE status = 'RUNNING' AND locked_until < NOW()";
        List<Job> jobs = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql);
                ResultSet rs = stmt.executeQuery()) {
            while (rs.next())
                jobs.add(mapJob(rs));
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find expired locks", e);
        }
        return jobs;
    }

    public void requeueJob(UUID jobId) {
        String sql = "UPDATE jobs SET status = 'PENDING', worker_id = NULL, locked_until = NULL WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to requeue job", e);
        }
    }

    public void moveToDLQ(UUID jobId, String reason) {
        String sql = "UPDATE jobs SET status = 'DLQ', last_error = ? WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, reason);
            stmt.setObject(2, jobId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to move to DLQ", e);
        }
    }

    public List<Job> findDLQJobs(int limit, int offset) {
        String sql = "SELECT * FROM jobs WHERE status = 'DLQ' ORDER BY created_at DESC LIMIT ? OFFSET ?";
        List<Job> jobs = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, limit);
            stmt.setInt(2, offset);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next())
                    jobs.add(mapJob(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to find DLQ jobs", e);
        }
        return jobs;
    }

    public void retryDLQJob(UUID jobId) {
        String sql = "UPDATE jobs SET status = 'PENDING', attempt_count = 0, worker_id = NULL, locked_until = NULL WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to retry DLQ job", e);
        }
    }

    public void appendJobEvent(UUID jobId, String eventType, Object payload) {
        String sql = "INSERT INTO job_events (job_id, event_type, payload) VALUES (?, ?, ?::jsonb)";
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            stmt.setString(2, eventType);
            stmt.setString(3, objectMapper.writeValueAsString(payload));
            stmt.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("Failed to append job event", e);
        }
    }

    public List<java.util.Map<String, Object>> findEventsByJobId(UUID jobId) {
        String sql = "SELECT * FROM job_events WHERE job_id = ? ORDER BY occurred_at ASC";
        List<java.util.Map<String, Object>> events = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
                PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, jobId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    java.util.Map<String, Object> event = new java.util.HashMap<>();
                    event.put("id", rs.getLong("id"));
                    event.put("job_id", rs.getObject("job_id").toString());
                    event.put("event_type", rs.getString("event_type"));
                    event.put("payload", objectMapper.readValue(rs.getString("payload"), java.util.Map.class));
                    event.put("occurred_at", rs.getTimestamp("occurred_at").toInstant().toString());
                    events.add(event);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to find job events", e);
        }
        return events;
    }

    private Job mapJob(ResultSet rs) throws SQLException {
        Job job = new Job();
        job.setId((UUID) rs.getObject("id"));
        job.setIdempotencyKey(rs.getString("idempotency_key"));
        job.setQueue(rs.getString("queue"));
        job.setPriority(rs.getInt("priority"));
        job.setPayload(rs.getString("payload"));
        job.setStatus(com.evora.domain.JobStatus.valueOf(rs.getString("status")));
        job.setAttemptCount(rs.getInt("attempt_count"));
        job.setMaxAttempts(rs.getInt("max_attempts"));
        job.setWorkerId(rs.getString("worker_id"));

        Timestamp lockedUntil = rs.getTimestamp("locked_until");
        if (lockedUntil != null)
            job.setLockedUntil(lockedUntil.toInstant());

        Timestamp scheduledAt = rs.getTimestamp("scheduled_at");
        if (scheduledAt != null)
            job.setScheduledAt(scheduledAt.toInstant());

        Timestamp completedAt = rs.getTimestamp("completed_at");
        if (completedAt != null)
            job.setCompletedAt(completedAt.toInstant());

        job.setLastError(rs.getString("last_error"));

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null)
            job.setCreatedAt(createdAt.toInstant());

        return job;
    }
}
