package com.evora.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;

public final class PostgresDataSourceFactory {
    private PostgresDataSourceFactory() {
    }

    public static DataSource create(EvoraProperties properties) {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(properties.postgresJdbcUrl());
        hikariConfig.setUsername(properties.postgresUser());
        hikariConfig.setPassword(properties.postgresPassword());
        hikariConfig.setMaximumPoolSize(properties.postgresPoolSize());
        hikariConfig.setMinimumIdle(Math.min(2, properties.postgresPoolSize()));
        hikariConfig.setPoolName("evora-postgres-pool");
        hikariConfig.setAutoCommit(true);
        hikariConfig.setConnectionTimeout(10_000);
        hikariConfig.setIdleTimeout(60_000);
        hikariConfig.setMaxLifetime(600_000);
        return new HikariDataSource(hikariConfig);
    }
}
