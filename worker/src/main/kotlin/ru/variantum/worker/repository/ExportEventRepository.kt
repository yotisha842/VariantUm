package ru.variantum.worker.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.query.Param
import ru.variantum.worker.domain.ExportEventRecord
import java.util.UUID

interface ExportEventRepository : JpaRepository<ExportEventRecord, UUID> {

    fun findTop20ByOrderByReceivedAtDesc(): List<ExportEventRecord>

    fun countByFormat(@Param("format") format: String): Long
}
