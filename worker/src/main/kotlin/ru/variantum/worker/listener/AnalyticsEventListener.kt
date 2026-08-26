package ru.variantum.worker.listener

import com.fasterxml.jackson.databind.ObjectMapper
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import ru.variantum.worker.domain.AnalysisEventRecord
import ru.variantum.worker.domain.ExportEventRecord
import ru.variantum.worker.event.DocumentAnalyzedEvent
import ru.variantum.worker.event.ExportCompletedEvent
import ru.variantum.worker.repository.AnalysisEventRepository
import ru.variantum.worker.repository.ExportEventRepository
import java.time.OffsetDateTime
import java.time.ZoneOffset

/** A failed DB write rolls back the delivery marker and reaches Kafka's retry/DLT handler. */
@Component
class AnalyticsEventListener(
    private val exportEventRepository: ExportEventRepository,
    private val analysisEventRepository: AnalysisEventRepository,
    private val objectMapper: ObjectMapper,
    private val jdbc: JdbcTemplate,
) {
    @Transactional
    @KafkaListener(topics = ["variantum.export.completed"], groupId = "variantum-worker")
    fun onExportCompleted(record: ConsumerRecord<String, String>) = once(record) {
        val event = objectMapper.readValue(record.value(), ExportCompletedEvent::class.java)
        exportEventRepository.saveAndFlush(ExportEventRecord(
            projectId = event.projectId, userId = event.userId, format = event.format,
            sizeBytes = event.sizeBytes, occurredAt = OffsetDateTime.ofInstant(event.occurredAt, ZoneOffset.UTC),
        ))
    }

    @Transactional
    @KafkaListener(topics = ["variantum.document.analyzed"], groupId = "variantum-worker")
    fun onDocumentAnalyzed(record: ConsumerRecord<String, String>) = once(record) {
        val event = objectMapper.readValue(record.value(), DocumentAnalyzedEvent::class.java)
        analysisEventRepository.saveAndFlush(AnalysisEventRecord(
            subject = event.subject, textLength = event.textLength,
            occurredAt = OffsetDateTime.ofInstant(event.occurredAt, ZoneOffset.UTC),
        ))
    }

    private fun once(record: ConsumerRecord<String, String>, save: () -> Unit) {
        val key = "${record.topic()}:${record.partition()}:${record.offset()}"
        if (jdbc.update("INSERT INTO worker_processed_events(event_key) VALUES (?) ON CONFLICT DO NOTHING", key) == 1) save()
    }
}
