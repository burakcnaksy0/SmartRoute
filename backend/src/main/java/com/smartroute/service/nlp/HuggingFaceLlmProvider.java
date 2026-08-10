package com.smartroute.service.nlp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class HuggingFaceLlmProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(HuggingFaceLlmProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${huggingface.api.key}")
    private String hfApiKey;

    @Value("${huggingface.api.baseUrl}")
    private String hfBaseUrl;

    @Value("${huggingface.api.model}")
    private String hfModel;

    public HuggingFaceLlmProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .build();
    }

    @Override
    public String generate(String systemPrompt, String userPrompt) {
        String url = hfBaseUrl + "/v1/chat/completions";

        Map<String, Object> requestBody = Map.of(
                "model", hfModel,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", 1500,
                "temperature", 0.1
        );

        try {
            JsonNode response = restClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + hfApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && response.has("choices")) {
                JsonNode choices = response.get("choices");
                if (choices.isArray() && choices.size() > 0) {
                    JsonNode messageNode = choices.get(0).get("message");
                    if (messageNode != null && messageNode.has("content")) {
                        return messageNode.get("content").asText();
                    }
                }
            }
            throw new RuntimeException("Hugging Face API'den geçerli içerik alınamadı.");
        } catch (Exception e) {
            log.error("Hugging Face API çağrısı sırasında hata oluştu: ", e);
            throw new RuntimeException("Doğal dil işleme servisine şu an erişilemiyor. Lütfen manuel ekleme yapın.", e);
        }
    }
}
