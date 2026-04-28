package com.evora;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import org.bson.Document;
import java.util.ArrayList;

public class TestMongo {
    public static void main(String[] args) {
        try (MongoClient mongoClient = MongoClients.create("mongodb://localhost:27017")) {
            MongoCollection<Document> coll = mongoClient.getDatabase("evora").getCollection("queue_stats");
            var docs = new ArrayList<Document>();
            coll.find().into(docs);
            System.out.println("Found " + docs.size() + " documents.");
            for (Document d : docs) {
                System.out.println(d.toJson());
            }
        }
    }
}
