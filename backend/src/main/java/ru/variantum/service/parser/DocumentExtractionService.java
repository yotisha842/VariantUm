package ru.variantum.service.parser;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.variantum.exception.LlmFailureException;
import ru.variantum.service.llm.TextCleanupService;
import ru.variantum.service.llm.VisionExtractionService;

/** One extraction pipeline shared by initial uploads and reference re-parsing. */
@Service
@RequiredArgsConstructor
public class DocumentExtractionService {
    private final FileParserRegistry parsers;
    private final VisionExtractionService vision;
    private final TextCleanupService cleanup;
    public record Result(String text, String parser) {}

    public Result extract(byte[] bytes, String mime, String name, boolean clean) {
        try {
            String text;
            String parser;
            if (mime.startsWith("image/")) {
                try { text = vision.extract(bytes, name, mime); parser = "gigachat-vision"; }
                catch (Exception ignored) {
                    text = cleanup.cleanup(parsers.parseBytes(bytes, mime, name));
                    parser = "tesseract+cleanup";
                }
            } else {
                String parsed = parsers.parseBytes(bytes, mime, name);
                text = clean ? cleanup.cleanup(parsed) : parsed;
                parser = clean ? "parser+cleanup" : "parser";
            }
            if (text == null || text.isBlank()) throw new IllegalArgumentException("Пустой текст");
            return new Result(text, parser);
        } catch (Exception e) {
            throw new LlmFailureException("Не удалось распознать документ. Проверьте формат и качество файла.", false);
        }
    }
}
