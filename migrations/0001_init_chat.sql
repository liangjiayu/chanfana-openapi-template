-- Migration number: 0001 	 2026-06-28T00:00:00.000Z
-- 对话 API：会话表 + 消息表

-- conversations：一个对话会话
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,                 -- crypto.randomUUID()
    title TEXT NOT NULL DEFAULT '新对话',
    model TEXT NOT NULL DEFAULT 'deepseek-chat',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- messages：对话内的一条消息（user / assistant / system）
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,                 -- crypto.randomUUID()
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,                  -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    prompt_tokens INTEGER,              -- 仅 assistant 行记录用量，可空
    completion_tokens INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
