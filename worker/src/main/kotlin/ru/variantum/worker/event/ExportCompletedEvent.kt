package ru.variantum.worker.event

import java.time.Instant
import java.util.UUID

/**
 * Payload события variantum.export.completed, публикуемого backend-сервисом.
 * Поля должны соответствовать ru.variantum.event.ExportCompletedEvent в backend —
 * сервисы независимы и не делят общий jar, контракт — это сама Kafka-тема.
 */
data class ExportCompletedEvent(
    val projectId: UUID,
    val userId: UUID,
    val format: String,
    val sizeBytes: Int,
    val occurredAt: Instant,
)
