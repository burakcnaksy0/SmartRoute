package com.smartroute.service.nlp;

public interface LlmProvider {
    String generate(String systemPrompt, String userPrompt);
}
