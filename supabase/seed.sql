-- ==============================================================================
-- ChatLixy Seed Data: 5+ Demo Contacts, Pre-Configured Conversations & Messages
-- Includes phone numbers, avatars, view-once media, and Discord-style reactions
-- ==============================================================================

DO $$
DECLARE
    -- User IDs
    u_alex UUID := '11111111-1111-4111-a111-111111111111';
    u_lexi UUID := '22222222-2222-4222-a222-222222222222';
    u_elena UUID := '33333333-3333-4333-a333-333333333333';
    u_marcus UUID := '44444444-4444-4444-a444-444444444444';
    u_sophia UUID := '55555555-5555-4555-a555-555555555555';
    u_kai UUID := '66666666-6666-4666-a666-666666666666';

    -- Conversation IDs
    c_alex_lexi UUID := 'aaaaaaaa-1111-4aaa-aaaa-111111111111';
    c_alex_elena UUID := 'bbbbbbbb-2222-4bbb-bbbb-222222222222';
    c_alex_marcus UUID := 'cccccccc-3333-4ccc-cccc-333333333333';
    c_alex_sophia UUID := 'dddddddd-4444-4ddd-dddd-444444444444';
    c_alex_kai UUID := 'eeeeeeee-5555-4eee-eeee-555555555555';
    c_group_core UUID := 'ffffffff-6666-4fff-ffff-666666666666';

BEGIN
    -- 1. Insert Demo Contacts
    INSERT INTO public.users (id, email, display_name, phone_number, avatar_url, status)
    VALUES
        (u_alex, 'alex@chatlixy.local', 'Alex Vance', '+1 (555) 019-2831', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'online'),
        (u_lexi, 'lexi@chatlixy.local', 'Lexi Nova', '+1 (555) 014-9823', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'online'),
        (u_elena, 'elena@chatlixy.local', 'Elena Rostova', '+1 (555) 017-4420', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'online'),
        (u_marcus, 'marcus@chatlixy.local', 'Marcus Chen', '+1 (555) 012-7744', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'offline'),
        (u_sophia, 'sophia@chatlixy.local', 'Dr. Sophia Al-Mansoor', '+1 (555) 018-3391', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'online'),
        (u_kai, 'kai@chatlixy.local', 'Kai Sterling', '+1 (555) 016-5512', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'away')
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        phone_number = EXCLUDED.phone_number,
        avatar_url = EXCLUDED.avatar_url,
        status = EXCLUDED.status;

    -- 2. Insert Direct Conversations
    INSERT INTO public.conversations (id, type, name, avatar_url, created_by)
    VALUES
        (c_alex_lexi, 'direct', 'Lexi Nova', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', u_alex),
        (c_alex_elena, 'direct', 'Elena Rostova', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', u_alex),
        (c_alex_marcus, 'direct', 'Marcus Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', u_alex),
        (c_alex_sophia, 'direct', 'Dr. Sophia Al-Mansoor', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', u_alex),
        (c_alex_kai, 'direct', 'Kai Sterling', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', u_alex),
        (c_group_core, 'group', 'ChatLixy Security Core', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', u_alex)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Participants
    INSERT INTO public.participants (conversation_id, user_id, role)
    VALUES
        (c_alex_lexi, u_alex, 'admin'), (c_alex_lexi, u_lexi, 'member'),
        (c_alex_elena, u_alex, 'admin'), (c_alex_elena, u_elena, 'member'),
        (c_alex_marcus, u_alex, 'admin'), (c_alex_marcus, u_marcus, 'member'),
        (c_alex_sophia, u_alex, 'admin'), (c_alex_sophia, u_sophia, 'member'),
        (c_alex_kai, u_alex, 'admin'), (c_alex_kai, u_kai, 'member'),
        (c_group_core, u_alex, 'admin'), (c_group_core, u_lexi, 'member'), (c_group_core, u_elena, 'member'), (c_group_core, u_marcus, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- 4. Insert Initial Messages with Reactions and View Once Flags
    INSERT INTO public.messages (
        id, conversation_id, sender_id, ciphertext, iv, media_type, media_url, voice_duration, status, reactions, is_view_once, is_opened, created_at
    )
    VALUES
        -- Thread with Lexi Nova
        ('00000000-0000-4000-8000-000000000001', c_alex_lexi, u_lexi,
         'g2+6qH8oIq1k7ZJ0v3p8tL61/cO26oX92aZzZcZpI7A==', 'MDEyMzQ1Njc4OWFi',
         'text', NULL, NULL, 'read',
         '[{"emoji":"🔥","users":["11111111-1111-4111-a111-111111111111"]},{"emoji":"🚀","users":["22222222-2222-4222-a222-222222222222"]}]'::jsonb,
         false, false, NOW() - INTERVAL '2 hours'),

        ('00000000-0000-4000-8000-000000000002', c_alex_lexi, u_alex,
         'kP8v3m1q8T+V29J1wL8s0a3K/zX74nY50bVvWwXyZ8B==', 'YWJjZGVmZ2hpamts',
         'text', NULL, NULL, 'read',
         '[{"emoji":"❤️","users":["22222222-2222-4222-a222-222222222222"]}]'::jsonb,
         false, false, NOW() - INTERVAL '1 hour'),

        ('00000000-0000-4000-8000-000000000003', c_alex_lexi, u_lexi,
         'qR7k9L1p5M2n0B8v3C4x1Z6y8A9s2D7f4G5h1J3k0L==', 'ZGVmZ2hpamtsbW5v',
         'image', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600', NULL, 'delivered',
         '[]'::jsonb, true, false, NOW() - INTERVAL '15 minutes'),

        -- Thread with Elena Rostova
        ('00000000-0000-4000-8000-000000000004', c_alex_elena, u_elena,
         'aB3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V==', 'MDEyMzQ1Njc4OWFi',
         'text', NULL, NULL, 'read',
         '[{"emoji":"👍","users":["11111111-1111-4111-a111-111111111111"]}]'::jsonb,
         false, false, NOW() - INTERVAL '3 hours'),

        -- Thread with Marcus Chen
        ('00000000-0000-4000-8000-000000000005', c_alex_marcus, u_marcus,
         'zX9y8W7v6U5t4S3r2Q1p0O9n8M7l6K5j4I3h2G1f0E==', 'YWJjZGVmZ2hpamts',
         'text', NULL, NULL, 'read',
         '[]'::jsonb, false, false, NOW() - INTERVAL '5 hours'),

        -- Thread with Dr. Sophia Al-Mansoor
        ('00000000-0000-4000-8000-000000000006', c_alex_sophia, u_sophia,
         'mN1b2V3c4X5z6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T==', 'ZGVmZ2hpamtsbW5v',
         'text', NULL, NULL, 'read',
         '[{"emoji":"🔒","users":["11111111-1111-4111-a111-111111111111"]}]'::jsonb,
         false, false, NOW() - INTERVAL '1 day'),

        -- Thread with Kai Sterling
        ('00000000-0000-4000-8000-000000000007', c_alex_kai, u_kai,
         'pL0k9J8h7G6f5D4s3A2z1X0c9V8b7N6m5Q4w3E2r1T==', 'MDEyMzQ1Njc4OWFi',
         'text', NULL, NULL, 'read',
         '[]'::jsonb, false, false, NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;

END $$;
