package ru.variantum.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateProjectRequest(
        @NotNull @Pattern(regexp = "FROM_CRITERIA|FROM_REFERENCE") String mode,

        // FROM_CRITERIA
        @Valid CriteriaData criteria,

        // FROM_REFERENCE
        @Size(max = 100000) String referenceText,
        AnalysisData analysis,

        // common
        @NotNull @Valid ParamsData params
) {
    @AssertTrue(message = "Укажите критерии или текст эталона для выбранного режима")
    public boolean isModeConsistent() {
        return "FROM_CRITERIA".equals(mode) ? criteria != null
                : "FROM_REFERENCE".equals(mode) && referenceText != null && !referenceText.isBlank();
    }

    public record CriteriaData(
            @NotBlank String subject,
            @Min(1) @Max(11) int grade,
            @NotBlank String topic,
            String taskType,
            @Min(1) @Max(20) int tasksPerVariant,
            @Min(5) @Max(180) int targetTimeMinutes,
            @Min(1) @Max(5) int difficulty
    ) {}

    public record AnalysisData(
            String subject,
            int grade,
            String topic,
            String taskType,
            int difficulty
    ) {}

    public record ParamsData(
            @Min(2) @Max(10) int variantsCount,
            List<String> variationTypes,
            List<String> fixedElements,
            String difficultyGradation,
            List<Integer> difficultyLevels,
            String customPrompt
    ) {}
}
