package ru.variantum.worker.config

import org.apache.kafka.clients.admin.NewTopic
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.TopicBuilder
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer
import org.springframework.kafka.listener.DefaultErrorHandler
import org.springframework.util.backoff.FixedBackOff

@Configuration
class KafkaErrorConfig {
    @Bean
    fun errorHandler(template: KafkaTemplate<String, String>): DefaultErrorHandler {
        val recovery = DeadLetterPublishingRecoverer(template)
        recovery.setFailIfSendResultIsError(true)
        return DefaultErrorHandler(recovery, FixedBackOff(1000L, 2L))
    }

    @Bean
    fun exportDeadLetters(): NewTopic = TopicBuilder.name("variantum.export.completed.DLT").partitions(3).replicas(1).build()

    @Bean
    fun analysisDeadLetters(): NewTopic = TopicBuilder.name("variantum.document.analyzed.DLT").partitions(3).replicas(1).build()
}
