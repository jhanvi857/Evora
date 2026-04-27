package com.evora.application;

import com.evora.config.EvoraProperties;
import com.evora.config.MongoClientFactory;
import com.evora.config.PostgresDataSourceFactory;
import com.evora.bus.EventBus;
import com.evora.bus.InMemoryEventBus;
import com.evora.outbox.OutboxRelay;
import com.evora.projection.MongoJobViewRepository;
import com.evora.projection.JobProjector;
import com.evora.projection.JobViewRepository;
import com.evora.saga.JobExecutionSaga;
import com.evora.saga.service.*;
import com.evora.store.EventJsonSerde;
import com.evora.store.EventReplayService;
import com.evora.store.PostgresEventStore;
import com.mongodb.client.MongoClient;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class EvoraRuntime {
    private final JobCommandService commandService;
    private final JobQueryService queryService;
    private final JobTimelineService timelineService;
    private final EventReplayService replayService;
    private final OutboxRelay outboxRelay;
    private final MongoClient mongoClient;
    private final DataSource dataSource;

    private EvoraRuntime(
            JobCommandService commandService,
            JobQueryService queryService,
            JobTimelineService timelineService,
            EventReplayService replayService,
            OutboxRelay outboxRelay,
            MongoClient mongoClient,
            DataSource dataSource) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.timelineService = timelineService;
        this.replayService = replayService;
        this.outboxRelay = outboxRelay;
        this.mongoClient = mongoClient;
        this.dataSource = dataSource;
    }

    public static EvoraRuntime create(EvoraRuntimeConfig config) {
        EvoraProperties properties = EvoraProperties.load();
        DataSource dataSource = PostgresDataSourceFactory.create(properties);
        runMigration(dataSource);
        EventJsonSerde serde = new EventJsonSerde();

        PostgresEventStore eventStore = new PostgresEventStore(dataSource, serde);
        EventBus eventBus = new InMemoryEventBus();
        JobEventAppender appender = new JobEventAppender(eventStore, eventBus);

        ValidationService validationService = new ValidationWorker(config.validationSeed(),
                config.validationFailureRate());
        ExecutionService executionService = new ExecutionWorker(config.executionSeed(), config.executionFailureRate());
        NotificationService notificationService = new NotificationWorker(config.notificationSeed(),
                config.notificationFailureRate());

        MongoClient mongoClient = MongoClientFactory.create(properties);
        JobViewRepository viewRepository = new MongoJobViewRepository(
                mongoClient.getDatabase(properties.mongoDatabase()),
                properties.mongoOrderViewsCollection());

        JobProjector projector = new JobProjector(viewRepository);
        JobExecutionSaga jobSaga = new JobExecutionSaga(appender, validationService, executionService,
                notificationService);

        eventBus.subscribe(jobSaga);

        OutboxRelay outboxRelay = new OutboxRelay(dataSource, projector, serde, properties.outboxPollIntervalMs());
        outboxRelay.start();

        EventReplayService replayService = new EventReplayService(eventStore, viewRepository, projector);

        JobCommandService commandService = new JobCommandService(appender, replayService);
        JobQueryService queryService = new JobQueryService(viewRepository);
        JobTimelineService timelineService = new JobTimelineService(eventStore);

        return new EvoraRuntime(commandService, queryService, timelineService, replayService, outboxRelay, mongoClient,
                dataSource);
    }

    public JobCommandService commandService() {
        return commandService;
    }

    public JobQueryService queryService() {
        return queryService;
    }

    public JobTimelineService timelineService() {
        return timelineService;
    }

    public EventReplayService replayService() {
        return replayService;
    }

    public void shutdown() {
        outboxRelay.close();
        mongoClient.close();
        if (dataSource instanceof AutoCloseable closeable) {
            try {
                closeable.close();
            } catch (Exception ignored) {
            }
        }
    }

    private static void runMigration(DataSource dataSource) {
        String migrationSql = readMigrationSql();
        String[] statements = migrationSql.split(";\\s*(\\r?\\n|$)");
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement()) {
            for (String sql : statements) {
                String trimmed = sql.trim();
                if (!trimmed.isEmpty()) {
                    statement.execute(trimmed);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to initialize PostgreSQL schema", e);
        }
    }

    private static String readMigrationSql() {
        try (InputStream inputStream = EvoraRuntime.class.getClassLoader()
                .getResourceAsStream("db/migration/V1__evora_postgres_schema.sql")) {
            if (inputStream == null) {
                throw new IllegalStateException("Migration file not found: db/migration/V1__evora_postgres_schema.sql");
            }
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read migration file", e);
        }
    }
}
