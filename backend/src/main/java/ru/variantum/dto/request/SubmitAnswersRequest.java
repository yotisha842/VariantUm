package ru.variantum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

public record SubmitAnswersRequest(
        @NotBlank @Size(max = 255) String studentName,
        String studentId,
        @NotNull @Size(max = 200) List<@NotNull @Valid TaskAnswer> answers
) {
    public record TaskAnswer(@NotNull UUID taskId, @Size(max = 20000) String answer) {}
}
