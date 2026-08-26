package ru.variantum.worker.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.variantum.worker.domain.AnalysisEventRecord
import ru.variantum.worker.domain.ExportEventRecord
import ru.variantum.worker.repository.AnalysisEventRepository
import ru.variantum.worker.repository.ExportEventRepository

/** Показывает, что worker реально принимает и хранит события — для проверки и демо. */
@RestController
@RequestMapping("/stats")
class StatsController(
    private val exportEventRepository: ExportEventRepository,
    private val analysisEventRepository: AnalysisEventRepository,
) {

    @GetMapping("/exports")
    fun exports(): StatsResponse<ExportEventRecord> =
        StatsResponse(exportEventRepository.count(), exportEventRepository.findTop20ByOrderByReceivedAtDesc())

    @GetMapping("/analyses")
    fun analyses(): StatsResponse<AnalysisEventRecord> =
        StatsResponse(analysisEventRepository.count(), analysisEventRepository.findTop20ByOrderByReceivedAtDesc())

    data class StatsResponse<T>(val total: Long, val recent: List<T>)
}
