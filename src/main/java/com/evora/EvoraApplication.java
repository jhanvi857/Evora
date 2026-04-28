package com.evora;

import com.evora.api.http.HttpOrderServer;
import com.evora.bus.InMemoryEventBus;
import com.evora.handler.SubmitJobCommandHandler;
import com.evora.lifecycle.JobLifecycleManager;
import com.evora.store.PostgresJobStore;
import com.evora.worker.PriorityWorkerDispatcher;
import com.evora.worker.VisibilityTimeoutSweeper;
import com.evora.projection.JobProjector;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import io.github.cdimascio.dotenv.Dotenv;
import org.postgresql.ds.PGSimpleDataSource;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class EvoraApplication {
    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.load();
        
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setURL(dotenv.get("EVORA_POSTGRES_JDBC_URL", "jdbc:postgresql://localhost:5432/evora"));
        ds.setUser(dotenv.get("EVORA_POSTGRES_USERNAME", "postgres"));
        ds.setPassword(dotenv.get("EVORA_POSTGRES_PASSWORD", "postgres"));

        MongoClient mongoClient = MongoClients.create(dotenv.get("EVORA_MONGO_URI", "mongodb://localhost:27017"));

        InMemoryEventBus eventBus = new InMemoryEventBus();
        PostgresJobStore jobStore = new PostgresJobStore(ds);
        
        JobProjector projector = new JobProjector(mongoClient);
        eventBus.subscribe(projector);
        
        SubmitJobCommandHandler submitHandler = new SubmitJobCommandHandler(jobStore, eventBus);
        PriorityWorkerDispatcher dispatcher = new PriorityWorkerDispatcher(jobStore);
        JobLifecycleManager lifecycleManager = new JobLifecycleManager(jobStore, eventBus);

        ScheduledExecutorService sweeper = Executors.newSingleThreadScheduledExecutor();
        sweeper.scheduleAtFixedRate(new VisibilityTimeoutSweeper(jobStore, eventBus), 10, 10, TimeUnit.SECONDS);

        try {
            HttpOrderServer server = new HttpOrderServer(8080, submitHandler, dispatcher, jobStore, lifecycleManager, mongoClient);
            new Thread(server::start).start();
        } catch (Exception e) {
            System.err.println("Failed to start server: " + e.getMessage());
        }
    }
}
