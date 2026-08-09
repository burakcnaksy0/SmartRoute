package com.smartroute.dto;

import jakarta.validation.constraints.NotBlank;

public class RefreshRequest {

    @NotBlank(message = "Refresh token zorunludur")
    private String refreshToken;

    public RefreshRequest() {
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
