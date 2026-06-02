-- Add token usage tracking columns to profiles table
-- This migration adds support for tracking user's API token consumption

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_token_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster token reset queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_token_reset ON profiles(last_token_reset);

-- Add comment for documentation
COMMENT ON COLUMN profiles.total_tokens_used IS 'Total API tokens consumed by this user';
COMMENT ON COLUMN profiles.daily_tokens_used IS 'API tokens consumed today (resets daily)';
COMMENT ON COLUMN profiles.last_token_reset IS 'Last time daily tokens were reset';
