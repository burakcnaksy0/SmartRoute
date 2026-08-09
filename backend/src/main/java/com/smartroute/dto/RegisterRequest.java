package com.smartroute.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Geçersiz e-posta formatı")
    private String email;

    @NotBlank(message = "Şifre zorunludur")
    @Size(min = 6, message = "Şifre en az 6 karakter olmalıdır")
    private String password;

    @NotBlank(message = "Ad soyad zorunludur")
    private String fullName;

    private String defaultVehicleType;

    public RegisterRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getDefaultVehicleType() {
        return defaultVehicleType;
    }

    public void setDefaultVehicleType(String defaultVehicleType) {
        this.defaultVehicleType = defaultVehicleType;
    }
}
