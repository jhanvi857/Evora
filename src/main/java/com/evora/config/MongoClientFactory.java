package com.evora.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

public final class MongoClientFactory {
    private MongoClientFactory() {
    }

    public static MongoClient create(EvoraProperties properties) {
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(properties.mongoUri()))
                .build();
        return MongoClients.create(settings);
    }
}
