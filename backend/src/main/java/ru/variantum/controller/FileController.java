package ru.variantum.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.variantum.domain.UploadedFile;
import ru.variantum.dto.response.FileUploadResponse;
import ru.variantum.repository.UploadedFileRepository;
import ru.variantum.security.CurrentUser;
import ru.variantum.service.parser.DocumentExtractionService;
import ru.variantum.service.ratelimit.LlmCostService;
import ru.variantum.service.ratelimit.RateLimitService;
import ru.variantum.service.storage.MinioStorageService;
import ru.variantum.util.UploadValidation;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "Files")
public class FileController {
    private final DocumentExtractionService extraction;
    private final MinioStorageService storage;
    private final UploadedFileRepository files;
    private final RateLimitService quotas;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(@RequestPart("file") MultipartFile file,
                                                    @RequestParam(defaultValue = "true") boolean clean) throws IOException {
        UUID userId = CurrentUser.requireId();
        UploadValidation.validate(file);
        String name = UploadValidation.filename(file.getOriginalFilename());
        String mime = UploadValidation.contentType(file);
        byte[] bytes = file.getBytes();
        String key = storage.buildFileKey(userId, UUID.randomUUID().toString());
        double cost = clean || mime.startsWith("image/") ? LlmCostService.PARSE_PER_FILE : 0;
        try (var quota = quotas.reserve(userId, cost)) {
            storage.put(key, new ByteArrayInputStream(bytes), bytes.length, mime);
            var parsed = extraction.extract(bytes, mime, name, clean);
            UploadedFile saved = files.saveAndFlush(UploadedFile.builder().userId(userId).filename(name)
                    .mimeType(mime).sizeBytes(file.getSize()).storageKey(key)
                    .parsedText(parsed.text()).parserUsed(parsed.parser()).build());
            quota.complete(cost);
            return ResponseEntity.ok(new FileUploadResponse(saved.getId().toString(), name, mime, parsed.text()));
        } catch (RuntimeException e) {
            storage.delete(key);
            throw e;
        }
    }
}
