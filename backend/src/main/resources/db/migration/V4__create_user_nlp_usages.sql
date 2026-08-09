-- Create user_nlp_usages table
CREATE TABLE user_nlp_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    usage_count INT NOT NULL DEFAULT 0,
    CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
);

CREATE INDEX idx_user_nlp_usages_user_date ON user_nlp_usages(user_id, usage_date);
