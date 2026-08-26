package ru.variantum.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.time.Duration;

/** Trust JVM roots plus the official GigaChat CA; certificate and host checks remain enabled. */
@Configuration
@RequiredArgsConstructor
public class GigaChatConfig {
    private final AppProperties appProperties;

    @Bean
    public SslContext gigaChatSslContext() throws Exception {
        TrustManagerFactory defaults = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        defaults.init((KeyStore) null);
        KeyStore roots = KeyStore.getInstance(KeyStore.getDefaultType());
        roots.load(null);
        int index = 0;
        for (var manager : defaults.getTrustManagers()) {
            if (manager instanceof X509TrustManager certificates) {
                for (var certificate : certificates.getAcceptedIssuers()) roots.setCertificateEntry("jvm-" + index++, certificate);
            }
        }
        try (var stream = new ClassPathResource("certs/russian-trusted-root.crt").getInputStream()) {
            roots.setCertificateEntry("gigachat-root", CertificateFactory.getInstance("X.509").generateCertificate(stream));
        }
        TrustManagerFactory trusted = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        trusted.init(roots);
        return SslContextBuilder.forClient().trustManager(trusted).build();
    }

    @Bean("gigachatWebClient")
    public WebClient gigachatWebClient(SslContext gigaChatSslContext) {
        return client(gigaChatSslContext).baseUrl(appProperties.gigachat().apiUrl()).build();
    }

    @Bean("gigachatAuthWebClient")
    public WebClient gigachatAuthWebClient(SslContext gigaChatSslContext) {
        return client(gigaChatSslContext).build();
    }

    private WebClient.Builder client(SslContext context) {
        HttpClient client = HttpClient.create().secure(spec -> spec.sslContext(context))
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 15_000)
                .responseTimeout(Duration.ofSeconds(appProperties.gigachat().timeoutSeconds()));
        return WebClient.builder().clientConnector(new ReactorClientHttpConnector(client))
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(8 * 1024 * 1024));
    }
}
