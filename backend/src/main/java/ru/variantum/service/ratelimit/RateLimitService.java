package ru.variantum.service.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import ru.variantum.domain.User;
import ru.variantum.exception.RateLimitException;
import ru.variantum.repository.UserRepository;
import java.time.*;
import java.util.UUID;
import java.util.function.Function;

/** Reserve quota before external calls. Short, locked transactions prevent lost concurrent updates. */
@Service
@RequiredArgsConstructor
public class RateLimitService {
    private static final ZoneId ZONE = ZoneId.of("Europe/Moscow");
    private final UserRepository users;
    private final PlatformTransactionManager transactions;

    public Reservation reserve(UUID userId, double maximumCost) {
        if (!Double.isFinite(maximumCost) || maximumCost < 0) throw new IllegalArgumentException("Неверная стоимость запроса");
        LocalDate day = locked(userId, user -> {
            reset(user);
            charge(user, maximumCost);
            return user.getLimitResetDate();
        });
        return new Reservation(userId, day, maximumCost);
    }

    public LimitsSnapshot snapshot(UUID userId) {
        return locked(userId, user -> {
            reset(user);
            return new LimitsSnapshot(round(remaining(user)), round(user.getDailyPercentUsed()),
                    LlmCostService.DAILY_LIMIT, nextReset().toOffsetDateTime().toString());
        });
    }

    private <T> T locked(UUID userId, Function<User, T> action) {
        TransactionTemplate transaction = new TransactionTemplate(transactions);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return transaction.execute(status -> {
            User user = users.findByIdForUpdate(userId).orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
            return action.apply(user);
        });
    }

    private void adjust(UUID userId, LocalDate day, double difference) {
        locked(userId, user -> {
            reset(user);
            if (user.getLimitResetDate().equals(day)) charge(user, difference);
            return null;
        });
    }

    private void charge(User user, double cost) {
        if (cost > remaining(user) + 0.000001) throw new RateLimitException(
                "Недостаточно дневного лимита для этого запроса. Уменьшите количество вариантов или заданий.",
                Math.max(1, Duration.between(ZonedDateTime.now(ZONE), nextReset()).getSeconds()));
        user.setDailyPercentUsed(Math.max(0, Math.min(LlmCostService.DAILY_LIMIT, user.getDailyPercentUsed() + cost)));
    }

    private void reset(User user) {
        LocalDate today = LocalDate.now(ZONE);
        if (user.getLimitResetDate() == null || user.getLimitResetDate().isBefore(today)) {
            user.setDailyPercentUsed(0);
            user.setLimitResetDate(today);
        }
    }

    private double remaining(User user) { return Math.max(0, LlmCostService.DAILY_LIMIT - user.getDailyPercentUsed()); }
    private static ZonedDateTime nextReset() { return LocalDate.now(ZONE).plusDays(1).atStartOfDay(ZONE); }
    private static double round(double value) { return Math.round(value * 100) / 100.0; }
    public record LimitsSnapshot(double percentRemaining, double percentUsed, double limit, String resetAt) {}

    public final class Reservation implements AutoCloseable {
        private final UUID userId;
        private final LocalDate day;
        private final double reserved;
        private boolean completed;
        private Reservation(UUID userId, LocalDate day, double reserved) {
            this.userId = userId; this.day = day; this.reserved = reserved;
        }
        public void complete(double actualCost) {
            if (completed || !Double.isFinite(actualCost) || actualCost < 0) throw new IllegalStateException("Неверное завершение резерва");
            adjust(userId, day, actualCost - reserved);
            completed = true;
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) adjust(userId, day, -actualCost);
                    }
                });
            }
        }
        @Override public void close() {
            if (!completed) { adjust(userId, day, -reserved); completed = true; }
        }
    }
}
