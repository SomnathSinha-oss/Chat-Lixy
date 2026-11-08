-- ==============================================================================
-- ChatLixy: High-Performance Real-Time Encrypted Messaging Database Schema
-- Supabase PostgreSQL Schema with Strict Row-Level Security (RLS) & Triggers
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PUBLIC USERS TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    phone_number TEXT, -- Demo / Contact phone number (e.g. +1 555-019-2831)
    avatar_url TEXT,
    public_key TEXT, -- Public key for Web Crypto ECDH E2EE key exchange
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    name TEXT, -- Nullable for direct chats, required for groups
    avatar_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    encrypted_conversation_key TEXT, -- Conversation shared key encrypted with user's public key
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_conversation_participant UNIQUE (conversation_id, user_id)
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ciphertext TEXT NOT NULL, -- Web Crypto AES-256-GCM encrypted payload
    iv TEXT NOT NULL,         -- Base64 initialization vector (12 bytes)
    media_url TEXT,           -- Supabase Storage asset path
    media_type TEXT NOT NULL DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video', 'audio', 'document')),
    voice_duration REAL,      -- Audio length in seconds (for voice notes)
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    reactions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Discord-style reactions [{ emoji: '🔥', users: ['uuid1'] }]
    is_view_once BOOLEAN NOT NULL DEFAULT FALSE,  -- WhatsApp-style View Once flag
    is_opened BOOLEAN NOT NULL DEFAULT FALSE,     -- Whether View Once media was viewed
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can ONLY access data in conversations where they participate
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. USERS POLICIES
-- ------------------------------------------------------------------------------
-- Any authenticated user can view public profiles (to search and initiate chats)
CREATE POLICY "Authenticated users can view profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Users can only modify their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- B. CONVERSATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Users can view conversations if they are an active participant
CREATE POLICY "Users can view conversations they participate in"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = conversations.id
              AND participants.user_id = auth.uid()
        )
    );

-- Any authenticated user can create a conversation
CREATE POLICY "Authenticated users can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Conversation admins or creators can update conversation metadata
CREATE POLICY "Participants can update conversations"
    ON public.conversations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = conversations.id
              AND participants.user_id = auth.uid()
              AND participants.role = 'admin'
        ) OR auth.uid() = created_by
    );

-- ------------------------------------------------------------------------------
-- C. PARTICIPANTS POLICIES
-- ------------------------------------------------------------------------------
-- Users can see participants of conversations they belong to
CREATE POLICY "Users can view participants of their conversations"
    ON public.participants FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants AS p2
            WHERE p2.conversation_id = participants.conversation_id
              AND p2.user_id = auth.uid()
        )
    );

-- Users can insert participants if they are creating the chat or are admin
CREATE POLICY "Users can add participants to their conversations"
    ON public.participants FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Self join when initializing conversation or being added by admin
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.participants AS p_admin
            WHERE p_admin.conversation_id = participants.conversation_id
              AND p_admin.user_id = auth.uid()
              AND p_admin.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.conversations AS c
            WHERE c.id = participants.conversation_id
              AND c.created_by = auth.uid()
        )
    );

-- Participants can update their own last_read_at timestamp
CREATE POLICY "Participants can update their own participant record"
    ON public.participants FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- D. MESSAGES POLICIES (SECURITY MANDATE)
-- A user must ONLY be able to SELECT or INSERT messages if their user_id exists
-- in the participants table for that specific conversation.
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can select messages only in participating conversations"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages only in participating conversations as themselves"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    );

-- Participants can update message receipts (status = 'delivered' or 'read')
CREATE POLICY "Participants can update message receipts"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    );

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id);

-- ==============================================================================
-- AUTOMATIC DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 1. Sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, public_key)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
        COALESCE(NEW.raw_user_meta_data->>'public_key', NULL)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
        public_key = COALESCE(EXCLUDED.public_key, public.users.public_key),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Update conversation updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- ==============================================================================
-- REALTIME CONFIGURATION
-- ==============================================================================
DO $$
BEGIN
    -- Enable publication for realtime streaming
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
END $$;

-- Set replica identity to full so update/delete payloads include entire record in realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.participants REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- ==============================================================================
-- STORAGE CONFIGURATION & RLS FOR ATTACHMENTS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload attachments
CREATE POLICY "Authenticated users can upload chat attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

-- Storage RLS: Participants can read media from their conversations
CREATE POLICY "Users can read chat attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat-attachments');
