package ru.variantum.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.variantum.dto.response.AnalysisResponse;
import ru.variantum.dto.response.TaskSplitResponse;
import ru.variantum.service.llm.AnalyzeService;
import ru.variantum.service.llm.TaskSplitService;

@RestController
@RequestMapping("/analyze")
@RequiredArgsConstructor
@Tag(name = "Analyze")
public class AnalyzeController {

    private final ru.variantum.service.ratelimit.RateLimitService quotas;

    private final AnalyzeService analyzeService;
    private final TaskSplitService taskSplitService;

    @PostMapping("/task")
    public AnalysisResponse analyzeTask(@jakarta.validation.Valid @RequestBody AnalyzeRequest req) {
        try (var quota = quotas.reserve(ru.variantum.security.CurrentUser.requireId(), 2)) {
            var result = analyzeService.analyze(req.text(), req.hintSubject());
            quota.complete(2);
            return result;
        }
    }

    /**
     * Разбивает «сырой» текст (склейку из файлов + ручной ввод) на отдельные задания.
     * Варианты ответа теста и подпункты остаются внутри своего задания, ответы отделяются.
     */
    @PostMapping("/split")
    public TaskSplitResponse splitTasks(@jakarta.validation.Valid @RequestBody SplitRequest req) {
        try (var quota = quotas.reserve(ru.variantum.security.CurrentUser.requireId(), 2)) {
            var result = taskSplitService.split(req.text());
            quota.complete(2);
            return result;
        }
    }

    public record AnalyzeRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 100000) String text, String hintSubject) {}

    public record SplitRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 100000) String text) {}
}
