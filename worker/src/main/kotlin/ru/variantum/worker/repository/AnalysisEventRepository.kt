package ru.variantum.worker.repository

import org.springframework.data.jpa.repository.JpaRepository
import ru.variantum.worker.domain.AnalysisEventRecord
import java.util.UUID

interface AnalysisEventRepository : JpaRepository<AnalysisEventRecord, UUID> {

    fun findTop20ByOrderByReceivedAtDesc(): List<AnalysisEventRecord>
}
