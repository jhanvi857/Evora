package com.evora.config;

import io.github.cdimascio.dotenv.Dotenv;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public record EvoraProperties(
        String postgresJdbcUrl,
        String postgresUser,
        String postgresPassword,
        int postgresPoolSize,
        String mongoUri,
        String mongoDatabase,
        String mongoOrderViewsCollection,
        long outboxPollIntervalMs
) {
    public static EvoraProperties load() {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing()
                .ignoreIfMalformed()
                .load();

        Properties properties = new Properties();
        Path externalPath = resolveExternalConfigPath();

        if (externalPath != null && Files.exists(externalPath)) {
            try (InputStream inputStream = Files.newInputStream(externalPath)) {
                properties.load(inputStream);
            } catch (IOException e) {
                throw new IllegalStateException("Unable to load config from " + externalPath, e);
            }
        } else {
            try (InputStream inputStream = EvoraProperties.class.getClassLoader().getResourceAsStream("evora.properties")) {
                if (inputStream == null) {
                    throw new IllegalStateException("evora.properties was not found in classpath");
                }
                properties.load(inputStream);
            } catch (IOException e) {
                throw new IllegalStateException("Unable to load classpath config evora.properties", e);
            }
        }

        return new EvoraProperties(
        required(dotenv, properties, "EVORA_POSTGRES_JDBC_URL", "postgres.jdbcUrl"),
        required(dotenv, properties, "EVORA_POSTGRES_USERNAME", "postgres.username"),
        required(dotenv, properties, "EVORA_POSTGRES_PASSWORD", "postgres.password"),
        integer(dotenv, properties, "EVORA_POSTGRES_POOL_SIZE", "postgres.poolSize", 10),
        required(dotenv, properties, "EVORA_MONGO_URI", "mongo.uri"),
        required(dotenv, properties, "EVORA_MONGO_DATABASE", "mongo.database"),
        value(dotenv, properties, "EVORA_MONGO_ORDER_VIEWS_COLLECTION", "mongo.orderViewsCollection", "order_views"),
        longValue(dotenv, properties, "EVORA_OUTBOX_POLL_INTERVAL_MS", "outbox.pollIntervalMs", 500L)
        );
    }

    private static Path resolveExternalConfigPath() {
        String configured = System.getProperty("evora.config");
        if (configured == null || configured.isBlank()) {
            configured = System.getenv("EVORA_CONFIG");
        }
        if (configured == null || configured.isBlank()) {
            return null;
        }
        return Path.of(configured);
    }

    private static String required(Dotenv dotenv, Properties properties, String envKey, String propertyKey) {
        String value = firstNonBlank(dotenv.get(envKey), System.getenv(envKey), properties.getProperty(propertyKey));
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required configuration: " + envKey + " or " + propertyKey);
        }
        return value.trim();
    }

    private static String value(
            Dotenv dotenv,
            Properties properties,
            String envKey,
            String propertyKey,
            String defaultValue
    ) {
        String value = firstNonBlank(dotenv.get(envKey), System.getenv(envKey), properties.getProperty(propertyKey));
        return (value == null || value.isBlank()) ? defaultValue : value.trim();
    }

    private static int integer(
            Dotenv dotenv,
            Properties properties,
            String envKey,
            String propertyKey,
            int defaultValue
    ) {
        String value = firstNonBlank(dotenv.get(envKey), System.getenv(envKey), properties.getProperty(propertyKey));
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Integer.parseInt(value.trim());
    }

    private static long longValue(
            Dotenv dotenv,
            Properties properties,
            String envKey,
            String propertyKey,
            long defaultValue
    ) {
        String value = firstNonBlank(dotenv.get(envKey), System.getenv(envKey), properties.getProperty(propertyKey));
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return Long.parseLong(value.trim());
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
