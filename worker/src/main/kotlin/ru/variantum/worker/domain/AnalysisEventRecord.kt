package ru.variantum.worker.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "worker_analysis_events")
class AnalysisEventRecord(

    @Column(nullable = false, length = 100)
    var subject: String,

    @Column(name = "text_length", nullable = false)
    var textLength: Int,

    @Column(name = "occurred_at", nullable = false)
    var occurredAt: OffsetDateTime,
) {

    @Id
    @GeneratedValue
    var id: UUID? = null

    @Column(name = "received_at", nullable = false, updatable = false)
    var receivedAt: OffsetDateTime? = null

    @PrePersist
    fun onCreate() {
        if (receivedAt == null) receivedAt = OffsetDateTime.now()
    }
}
