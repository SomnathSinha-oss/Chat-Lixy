-- ==============================================================================
-- ChatLixy Seed Data for Development / Testing
-- ==============================================================================

-- Mock user entries (In Supabase Auth, these would be created via auth.signUp)
-- Below is a sample fixture script to verify RLS isolation:

DO $$
DECLARE
    u1_id UUID := '11111111-1111-4111-a111-111111111111';
    u2_id UUID := '22222222-2222-4222-a222-222222222222';
    conv_id UUID := '33333333-3333-4333-a333-333333333333';
BEGIN
    -- Insert demo users if not present
    INSERT INTO public.users (id, email, display_name, status)
    VALUES 
        (u1_id, 'alex@chatlixy.local', 'Alex Vance', 'online'),
        (u2_id, 'lexi@chatlixy.local', 'Lexi Nova', 'online')
    ON CONFLICT (id) DO UPDATE SET status = 'online';

    -- Insert a direct conversation
    INSERT INTO public.conversations (id, type, name, created_by)
    VALUES (conv_id, 'direct', 'Alex & Lexi', u1_id)
    ON CONFLICT (id) DO NOTHING;

    -- Add participants
    INSERT INTO public.participants (conversation_id, user_id, role)
    VALUES 
        (conv_id, u1_id, 'admin'),
        (conv_id, u2_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- Insert encrypted welcome message
    INSERT INTO public.messages (
        conversation_id, sender_id, ciphertext, iv, media_type, status
    )
    VALUES (
        conv_id,
        u2_id,
        'YwK1r0+k7M5g8V+HqgQ3mO5633N93Vv1aZzZcZpI7A==', -- AES-256-GCM sample ciphertext
        'MDEyMzQ1Njc4OWFi',                             -- 12-byte IV base64
        'text',
        'read'
    )
    ON CONFLICT DO NOTHING;
END $$;
