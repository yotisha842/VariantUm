package ru.variantum.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Public submission receipt; answer keys and teacher review never leave the teacher API. */
public record SubmissionReceiptResponse(UUID id, OffsetDateTime submittedAt, String attachmentToken) {}
