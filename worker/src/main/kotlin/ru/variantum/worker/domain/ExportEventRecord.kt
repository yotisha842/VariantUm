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
@Table(name = "worker_export_events")
class ExportEventRecord(

    @Column(name = "project_id", nullable = false)
    var projectId: UUID,

    @Column(name = "user_id", nullable = false)
    var userId: UUID,

    @Column(nullable = false, length = 10)
    var format: String,

    @Column(name = "size_bytes", nullable = false)
    var sizeBytes: Int,

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
