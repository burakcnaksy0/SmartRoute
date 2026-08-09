package com.smartroute.dto;

public class NlpParseRequest {
    private String text;

    public NlpParseRequest() {
    }

    public NlpParseRequest(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
