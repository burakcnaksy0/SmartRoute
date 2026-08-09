package com.smartroute.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/test")
public class TestController {

    @GetMapping("/protected")
    public ResponseEntity<Map<String, String>> protectedEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Erişim başarılı!");
        return ResponseEntity.ok(response);
    }
}
