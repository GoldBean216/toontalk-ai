-- SQL to create the chat_messages table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- The owner of the chat history
    contact_id TEXT NOT NULL, -- The ID of the contact/AI character
    sender_id TEXT NOT NULL, -- 'user' or the contact's ID
    text TEXT NOT NULL,
    raw_sound TEXT,
    audio_url TEXT,
    timestamp BIGINT NOT NULL,
    is_audio BOOLEAN DEFAULT false,
    message_type TEXT DEFAULT 'text', -- 'text', 'game', 'gift'
    game_data JSONB,
    gift_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own messages
CREATE POLICY "Users can insert their own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_contact ON chat_messages(user_id, contact_id);
