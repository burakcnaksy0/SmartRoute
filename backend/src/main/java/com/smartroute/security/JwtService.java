package com.smartroute.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${smartroute.jwt.secret:super-secret-key-that-is-at-least-256-bits-long-for-hmac-sha-256-smartroute-auth}")
    private String secret;

    @Value("${smartroute.jwt.access-ttl-ms:900000}") // 15 minutes
    private long accessTtlMs;

    @Value("${smartroute.jwt.refresh-ttl-ms:604800000}") // 7 days
    private long refreshTtlMs;

    public String generateAccessToken(UUID userId, String email) {
        return JWT.create()
                .withSubject(email)
                .withClaim("userId", userId.toString())
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + accessTtlMs))
                .sign(Algorithm.HMAC256(secret));
    }

    public String generateRefreshToken(UUID userId, String email) {
        return JWT.create()
                .withSubject(email)
                .withClaim("userId", userId.toString())
                .withClaim("type", "refresh")
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + refreshTtlMs))
                .sign(Algorithm.HMAC256(secret));
    }

    public DecodedJWT verifyToken(String token) {
        JWTVerifier verifier = JWT.require(Algorithm.HMAC256(secret)).build();
        return verifier.verify(token);
    }

    public boolean isRefreshToken(DecodedJWT jwt) {
        return "refresh".equals(jwt.getClaim("type").asString());
    }
}
