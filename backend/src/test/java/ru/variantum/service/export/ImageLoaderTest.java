package ru.variantum.service.export;

import org.junit.jupiter.api.Test;
import java.net.InetAddress;
import java.net.URI;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

class ImageLoaderTest {
    @Test void blocksLocalAndPrivateDestinations() throws Exception {
        for (String address : new String[]{"127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "0.1.2.3"}) {
            assertFalse(ImageLoader.publicAddress(InetAddress.getByName(address)), address);
        }
        for (String url : new String[]{"file:///etc/passwd", "http://127.0.0.1/a.png", "https://example.com:9000/a.png", "http://u:p@example.com/a.png"}) {
            assertThrows(IllegalArgumentException.class, () -> ImageLoader.validateUri(URI.create(url)), url);
        }
        assertTrue(ImageLoader.publicAddress(InetAddress.getByName("8.8.8.8")));
    }
    @Test void rejectsSvgFakeImagesAndOversizedData() {
        String svg = "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString("<svg/>".getBytes());
        assertThrows(IllegalArgumentException.class, () -> ImageLoader.load(svg));
        assertThrows(IllegalArgumentException.class, () -> ImageLoader.load("data:image/png;base64,SGVsbG8="));
        assertThrows(IllegalArgumentException.class, () -> ImageLoader.load("data:image/png;base64," + "A".repeat(7_000_000)));
    }
    @Test void acceptsAnEmbeddedPng() throws Exception {
        String png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFscAAAAASUVORK5CYII=";
        assertEquals("image/png", ImageLoader.load(png).mime());
    }
}
