package com.evora;

import org.postgresql.ds.PGSimpleDataSource;
import java.sql.Connection;

public class TestSql {
    public static void main(String[] args) {
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setURL("jdbc:postgresql://localhost:5432/evora");
        ds.setUser("postgres");
        ds.setPassword("postgres");
        try (Connection conn = ds.getConnection();
                java.sql.Statement stmt = conn.createStatement()) {
            System.out.println("Connected to DB");
            java.io.InputStream stream = TestSql.class.getResourceAsStream("/schema.sql");
            if (stream == null) {
                stream = new java.io.FileInputStream("src/main/resources/schema.sql");
            }
            @SuppressWarnings("resource")
            java.util.Scanner s = new java.util.Scanner(stream, "UTF-8").useDelimiter(";");
            while (s.hasNext()) {
                String sql = s.next().trim();
                if (!sql.isEmpty()) {
                    System.out.println("Executing: " + sql.substring(0, Math.min(20, sql.length())) + "...");
                    stmt.execute(sql);
                }
            }
            System.out.println("Checking jobs table...");
            try (java.sql.ResultSet rs = stmt.executeQuery("SELECT * FROM jobs LIMIT 1")) {
                System.out.println("Table exists");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
