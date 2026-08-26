package ru.variantum.service.export;

import okhttp3.Dns;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.util.Base64;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/** Bounded image downloads. DNS validation happens inside the client's actual connection resolver. */
final class ImageLoader {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final Set<String> TYPES = Set.of("image/png", "image/jpeg", "image/gif", "image/webp");
    private static final OkHttpClient CLIENT = new OkHttpClient.Builder()
            .dns(host -> {
                var addresses = Dns.SYSTEM.lookup(host);
                for (InetAddress address : addresses) {
                    if (!publicAddress(address)) throw new java.net.UnknownHostException("Private image address");
                }
                return addresses;
            })
            .followRedirects(false).followSslRedirects(false)
            .connectTimeout(6, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS)
            .callTimeout(20, TimeUnit.SECONDS).build();

    private ImageLoader() {}
    record Image(byte[] bytes, String mime) {
        String dataUrl() { return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes); }
    }

    static Image load(String source) throws IOException {
        if (source == null || source.isBlank()) throw new IllegalArgumentException("Пустое изображение");
        if (source.startsWith("data:")) {
            if (source.length() > MAX_BYTES * 4L / 3 + 100) throw new IllegalArgumentException("Изображение больше 5 МБ");
            int comma = source.indexOf(',');
            if (comma < 0 || !source.substring(0, comma).endsWith(";base64")) throw new IllegalArgumentException("Неверное изображение");
            return checked(Base64.getDecoder().decode(source.substring(comma + 1)),
                    source.substring(5, comma - 7).toLowerCase(java.util.Locale.ROOT));
        }
        URI uri = URI.create(source);
        for (int redirects = 0; redirects <= 3; redirects++) {
            Request request = new Request.Builder().url(uri.toString()).get().build();
            validateUri(request.url().uri());
            try (Response response = CLIENT.newCall(request).execute()) {
                if (response.isRedirect()) {
                    String location = response.header("Location");
                    if (location == null) throw new IOException("Image redirect has no destination");
                    uri = uri.resolve(location);
                    continue;
                }
                if (!response.isSuccessful() || response.body() == null) throw new IOException("Image server returned " + response.code());
                String mime = response.header("Content-Type", "").split(";", 2)[0].trim().toLowerCase(java.util.Locale.ROOT);
                if (!TYPES.contains(mime)) throw new IllegalArgumentException("Неподдерживаемый тип изображения");
                if (response.body().contentLength() > MAX_BYTES) throw new IllegalArgumentException("Изображение больше 5 МБ");
                try (var stream = response.body().byteStream()) { return checked(stream.readNBytes(MAX_BYTES + 1), mime); }
            }
        }
        throw new IOException("Too many image redirects");
    }

    static void validateUri(URI uri) {
        if (uri.getScheme() == null || !Set.of("https", "http").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 80 && uri.getPort() != 443)) {
            throw new IllegalArgumentException("Разрешены только публичные HTTP(S)-изображения");
        }
        // Literal IPs bypass some DNS resolvers; validate them before constructing the request.
        String host = uri.getHost();
        if (host.contains(":") || host.matches("[0-9.]+")) {
            try { if (!publicAddress(InetAddress.getByName(host))) throw new IllegalArgumentException("Локальный адрес изображения запрещён"); }
            catch (java.net.UnknownHostException e) { throw new IllegalArgumentException("Неверный адрес изображения", e); }
        }
    }

    static boolean publicAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        byte[] bytes = address.getAddress();
        if (bytes.length == 16) return (bytes[0] & 0xfe) != 0xfc;
        int a = bytes[0] & 255, b = bytes[1] & 255;
        return a != 0 && a < 224 && !(a == 100 && b >= 64 && b <= 127)
                && !(a == 198 && (b == 18 || b == 19)) && !(a == 192 && b == 0);
    }

    private static Image checked(byte[] bytes, String mime) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES || !TYPES.contains(mime)) throw new IllegalArgumentException("Неверное изображение или размер больше 5 МБ");
        String header = new String(bytes, 0, Math.min(bytes.length, 16), java.nio.charset.StandardCharsets.ISO_8859_1);
        boolean valid = switch (mime) {
            case "image/png" -> header.startsWith("\u0089PNG\r\n\u001a\n");
            case "image/jpeg" -> bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
            case "image/gif" -> header.startsWith("GIF87a") || header.startsWith("GIF89a");
            case "image/webp" -> header.startsWith("RIFF") && header.length() >= 12 && header.substring(8).startsWith("WEBP");
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException("Тип изображения не соответствует содержимому");
        return new Image(bytes, mime);
    }
}
