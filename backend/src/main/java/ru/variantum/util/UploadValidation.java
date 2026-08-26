package ru.variantum.util;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Check content signatures as well as names; uploaded HTML/SVG is never served inline. */
public final class UploadValidation {
    public static final long MAX_BYTES = 10 * 1024 * 1024;
    private UploadValidation() {}

    public static void validate(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Размер файла должен быть от 1 байта до 10 МБ");
        }
        contentType(file);
    }

    public static String filename(String original) {
        if (original == null) return "file";
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\r\\n\\x00-\\x1f]", "");
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    public static String contentType(MultipartFile file) {
        String name = filename(file.getOriginalFilename()).toLowerCase(Locale.ROOT);
        try (var stream = file.getInputStream()) {
            byte[] header = stream.readNBytes(16);
            String ascii = new String(header, StandardCharsets.ISO_8859_1);
            if (name.endsWith(".pdf") && ascii.startsWith("%PDF-")) return "application/pdf";
            if (name.endsWith(".docx") && ascii.startsWith("PK")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            if (name.endsWith(".txt")) return "text/plain";
            if ((name.endsWith(".jpg") || name.endsWith(".jpeg")) && header.length >= 3
                    && (header[0] & 255) == 255 && (header[1] & 255) == 216 && (header[2] & 255) == 255) return "image/jpeg";
            if (name.endsWith(".png") && ascii.startsWith("\u0089PNG\r\n\u001a\n")) return "image/png";
            if (name.endsWith(".webp") && ascii.length() >= 12 && ascii.startsWith("RIFF") && ascii.substring(8).startsWith("WEBP")) return "image/webp";
            if (name.endsWith(".gif") && (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a"))) return "image/gif";
        } catch (IOException e) {
            throw new IllegalArgumentException("Не удалось прочитать файл", e);
        }
        throw new IllegalArgumentException("Поддерживаются PDF, DOCX, TXT, JPG, PNG, GIF и WEBP; тип файла должен соответствовать содержимому");
    }
}
