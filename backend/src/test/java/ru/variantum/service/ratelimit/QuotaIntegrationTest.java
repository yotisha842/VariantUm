package ru.variantum.service.ratelimit;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.variantum.domain.User;
import ru.variantum.exception.RateLimitException;
import ru.variantum.repository.UserRepository;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {"spring.jpa.show-sql=false", "spring.flyway.baseline-version=0"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(RateLimitService.class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class QuotaIntegrationTest {
    @Container static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", POSTGRES::getUsername);
        properties.add("spring.datasource.password", POSTGRES::getPassword);
    }
    @Autowired RateLimitService quotas;
    @Autowired UserRepository users;
    UUID userId;
    @BeforeEach void user() {
        userId = users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@example.test")
                .passwordHash("unused-test-password").fullName("Test User").role(User.Role.TEACHER).build()).getId();
    }
    @Test void failedCallsReleaseReservations() {
        try (var reservation = quotas.reserve(userId, 30)) { assertEquals(70, quotas.snapshot(userId).percentRemaining()); }
        assertEquals(100, quotas.snapshot(userId).percentRemaining());
    }
    @Test void successfulCallsOnlyChargeTheirActualCost() {
        try (var reservation = quotas.reserve(userId, 30)) { reservation.complete(3); }
        assertEquals(97, quotas.snapshot(userId).percentRemaining());
    }
    @Test void concurrentCallsCannotSpendMoreThanTheDailyLimit() throws Exception {
        var pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Boolean>> calls = new ArrayList<>();
            for (int i=0; i<4; i++) calls.add(() -> {
                try (var reservation = quotas.reserve(userId, 40)) { reservation.complete(40); return true; }
                catch (RateLimitException e) { return false; }
            });
            int accepted = 0;
            for (var result : pool.invokeAll(calls)) if (result.get()) accepted++;
            assertEquals(2, accepted);
            assertEquals(20, quotas.snapshot(userId).percentRemaining());
        } finally { pool.shutdown(); }
    }
    @Test void workerMigrationsRunAlongsideAnExistingBackendSchema() throws Exception {
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("filesystem:../worker/src/main/resources/db/migration").table("flyway_schema_history_worker")
                .baselineOnMigrate(true).baselineVersion("0").load().migrate();
        try (var connection = POSTGRES.createConnection(""); var statement = connection.createStatement()) {
            statement.executeQuery("SELECT 1 FROM worker_export_events LIMIT 1").close();
            statement.executeQuery("SELECT 1 FROM worker_processed_events LIMIT 1").close();
        }
    }
}
