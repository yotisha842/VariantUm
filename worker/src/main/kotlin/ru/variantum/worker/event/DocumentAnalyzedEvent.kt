package ru.variantum.worker.event

import java.time.Instant

/** Payload события variantum.document.analyzed, публикуемого backend-сервисом. */
data class DocumentAnalyzedEvent(
    val subject: String,
    val textLength: Int,
    val occurredAt: Instant,
)
