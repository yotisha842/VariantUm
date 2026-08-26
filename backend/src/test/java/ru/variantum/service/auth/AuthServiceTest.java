package ru.variantum.service.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.http.Cookie;
import io.jsonwebtoken.Claims;
import ru.variantum.config.AppProperties;
import ru.variantum.domain.RefreshToken;
import ru.variantum.exception.UnauthorizedException;
import ru.variantum.repository.RefreshTokenRepository;
import ru.variantum.repository.UserRepository;
import ru.variantum.security.JwtService;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final UUID userId = UUID.randomUUID();
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final JwtService jwt = mock(JwtService.class);
    private static AppProperties properties() {
        return new AppProperties("", "", new AppProperties.Jwt("test-secret-at-least-32-characters-long", 900, 86400, "access", "refresh", true), null, null, null, null, null, null);
    }
    private AuthService service() { return new AuthService(mock(UserRepository.class), tokens, mock(org.springframework.security.crypto.password.PasswordEncoder.class), jwt, properties()); }
    private MockHttpServletRequest request() {
        var request = new MockHttpServletRequest(); request.setCookies(new Cookie("refresh", "token")); return request;
    }
    private void validSignature() {
        Claims claims = mock(Claims.class);
        when(jwt.parse("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());
        when(claims.get(JwtService.TOKEN_TYPE_CLAIM, String.class)).thenReturn(JwtService.TOKEN_TYPE_REFRESH);
    }
    @Test void refreshMustExistInDatabase() {
        validSignature(); when(tokens.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertThrows(UnauthorizedException.class, () -> service().refresh(request(), new MockHttpServletResponse()));
    }
    @Test void revokedAndExpiredRefreshAreRejected() {
        validSignature();
        var stored = RefreshToken.builder().userId(userId).revoked(true).expiresAt(OffsetDateTime.now().plusDays(1)).build();
        when(tokens.findByTokenHash(anyString())).thenReturn(Optional.of(stored));
        assertThrows(UnauthorizedException.class, () -> service().refresh(request(), new MockHttpServletResponse()));
        stored.setRevoked(false); stored.setExpiresAt(OffsetDateTime.now().minusSeconds(1));
        assertThrows(UnauthorizedException.class, () -> service().refresh(request(), new MockHttpServletResponse()));
    }
    @Test void logoutRevokesServerTokenAndClearsSecureCookies() {
        var token = RefreshToken.builder().userId(userId).build();
        when(tokens.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        var response = new MockHttpServletResponse(); service().logout(request(), response);
        assertTrue(token.getRevoked()); verify(tokens).save(token);
        assertTrue(response.getHeaders("Set-Cookie").stream().allMatch(cookie -> cookie.contains("Secure") && cookie.contains("Max-Age=0")));
    }
    @Test void refreshRotationCreatesUniqueTokensEvenWithinTheSameSecond() {
        var realJwt = new JwtService(properties());
        String first = realJwt.issueRefreshToken(userId), second = realJwt.issueRefreshToken(userId);
        assertNotEquals(first, second);
        assertEquals(userId.toString(), realJwt.parse(second).getSubject());
    }
}
