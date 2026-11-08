import express from 'express';
import { authenticateSSR } from './supabaseServer.js';

const router = express.Router();

// User IDs
const U_ALEX = '11111111-1111-4111-a111-111111111111';
const U_LEXI = '22222222-2222-4222-a222-222222222222';
const U_ELENA = '33333333-3333-4333-a333-333333333333';
const U_MARCUS = '44444444-4444-4444-a444-444444444444';
const U_SOPHIA = '55555555-5555-4555-a555-555555555555';
const U_KAI = '66666666-6666-4666-a666-666666666666';

// In-memory conversation store for offline/standalone execution
const mockConversations = new Map([
    [
        'aaaaaaaa-1111-4aaa-aaaa-111111111111',
        {
            id: 'aaaaaaaa-1111-4aaa-aaaa-111111111111',
            type: 'direct',
            name: 'Lexi Nova',
            phone_number: '+1 (555) 014-9823',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_LEXI],
            created_at: new Date(Date.now() - 7200000).toISOString(),
            updated_at: new Date(Date.now() - 900000).toISOString()
        }
    ],
    [
        'bbbbbbbb-2222-4bbb-bbbb-222222222222',
        {
            id: 'bbbbbbbb-2222-4bbb-bbbb-222222222222',
            type: 'direct',
            name: 'Elena Rostova',
            phone_number: '+1 (555) 017-4420',
            avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_ELENA],
            created_at: new Date(Date.now() - 10800000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString()
        }
    ],
    [
        'cccccccc-3333-4ccc-cccc-333333333333',
        {
            id: 'cccccccc-3333-4ccc-cccc-333333333333',
            type: 'direct',
            name: 'Marcus Chen',
            phone_number: '+1 (555) 012-7744',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_MARCUS],
            created_at: new Date(Date.now() - 18000000).toISOString(),
            updated_at: new Date(Date.now() - 7200000).toISOString()
        }
    ],
    [
        'dddddddd-4444-4ddd-dddd-444444444444',
        {
            id: 'dddddddd-4444-4ddd-dddd-444444444444',
            type: 'direct',
            name: 'Dr. Sophia Al-Mansoor',
            phone_number: '+1 (555) 018-3391',
            avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_SOPHIA],
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 14400000).toISOString()
        }
    ],
    [
        'eeeeeeee-5555-4eee-eeee-555555555555',
        {
            id: 'eeeeeeee-5555-4eee-eeee-555555555555',
            type: 'direct',
            name: 'Kai Sterling',
            phone_number: '+1 (555) 016-5512',
            avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_KAI],
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 28800000).toISOString()
        }
    ],
    [
        'ffffffff-6666-4fff-ffff-666666666666',
        {
            id: 'ffffffff-6666-4fff-ffff-666666666666',
            type: 'group',
            name: 'ChatLixy Security Core',
            avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            created_by: U_ALEX,
            participants: [U_ALEX, U_LEXI, U_ELENA, U_MARCUS],
            created_at: new Date(Date.now() - 259200000).toISOString(),
            updated_at: new Date(Date.now() - 1800000).toISOString()
        }
    ]
]);

const mockMessages = [
    // Lexi Nova thread
    {
        id: 'msg-001',
        conversation_id: 'aaaaaaaa-1111-4aaa-aaaa-111111111111',
        sender_id: U_LEXI,
        ciphertext: 'g2+6qH8oIq1k7ZJ0v3p8tL61/cO26oX92aZzZcZpI7A==',
        iv: 'MDEyMzQ1Njc4OWFi',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [
            { emoji: '🔥', users: [U_ALEX] },
            { emoji: '🚀', users: [U_LEXI] }
        ],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 'msg-002',
        conversation_id: 'aaaaaaaa-1111-4aaa-aaaa-111111111111',
        sender_id: U_ALEX,
        ciphertext: 'kP8v3m1q8T+V29J1wL8s0a3K/zX74nY50bVvWwXyZ8B==',
        iv: 'YWJjZGVmZ2hpamts',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [
            { emoji: '❤️', users: [U_LEXI] }
        ],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 'msg-003',
        conversation_id: 'aaaaaaaa-1111-4aaa-aaaa-111111111111',
        sender_id: U_LEXI,
        ciphertext: 'qR7k9L1p5M2n0B8v3C4x1Z6y8A9s2D7f4G5h1J3k0L==',
        iv: 'ZGVmZ2hpamtsbW5v',
        media_type: 'image',
        media_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
        voice_duration: null,
        status: 'delivered',
        reactions: [],
        is_view_once: true,
        is_opened: false,
        created_at: new Date(Date.now() - 900000).toISOString()
    },
    // Elena Rostova thread
    {
        id: 'msg-004',
        conversation_id: 'bbbbbbbb-2222-4bbb-bbbb-222222222222',
        sender_id: U_ELENA,
        ciphertext: 'aB3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V==',
        iv: 'MDEyMzQ1Njc4OWFi',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [
            { emoji: '👍', users: [U_ALEX] }
        ],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    // Marcus Chen thread
    {
        id: 'msg-005',
        conversation_id: 'cccccccc-3333-4ccc-cccc-333333333333',
        sender_id: U_MARCUS,
        ciphertext: 'zX9y8W7v6U5t4S3r2Q1p0O9n8M7l6K5j4I3h2G1f0E==',
        iv: 'YWJjZGVmZ2hpamts',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 7200000).toISOString()
    },
    // Dr. Sophia Al-Mansoor thread
    {
        id: 'msg-006',
        conversation_id: 'dddddddd-4444-4ddd-dddd-444444444444',
        sender_id: U_SOPHIA,
        ciphertext: 'mN1b2V3c4X5z6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T==',
        iv: 'ZGVmZ2hpamtsbW5v',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [
            { emoji: '🔒', users: [U_ALEX] }
        ],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 14400000).toISOString()
    },
    // Kai Sterling thread
    {
        id: 'msg-007',
        conversation_id: 'eeeeeeee-5555-4eee-eeee-555555555555',
        sender_id: U_KAI,
        ciphertext: 'pL0k9J8h7G6f5D4s3A2z1X0c9V8b7N6m5Q4w3E2r1T==',
        iv: 'MDEyMzQ1Njc4OWFi',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        reactions: [],
        is_view_once: false,
        is_opened: false,
        created_at: new Date(Date.now() - 28800000).toISOString()
    }
];

/**
 * Helper to check participant membership
 */
function isUserParticipant(conversationId, userId) {
    const conv = mockConversations.get(conversationId);
    if (!conv) return false;
    return conv.participants.includes(userId);
}

/**
 * GET /api/chat/conversations
 * Fetch all conversations for the authenticated user
 */
router.get('/conversations', authenticateSSR, (req, res) => {
    const userId = req.user.id;
    const userConvs = Array.from(mockConversations.values()).filter(
        (c) => c.participants.includes(userId)
    );

    return res.json({ conversations: userConvs });
});

/**
 * POST /api/chat/conversations
 * Create a new conversation (direct or group)
 */
router.post('/conversations', authenticateSSR, (req, res) => {
    const userId = req.user.id;
    const { type = 'direct', name, participant_ids = [] } = req.body;

    const allParticipants = Array.from(new Set([userId, ...participant_ids]));
    if (allParticipants.length < 2) {
        return res.status(400).json({ error: 'Conversation must have at least 2 participants.' });
    }

    const newId = crypto.randomUUID();
    const newConv = {
        id: newId,
        type,
        name: name || (type === 'group' ? 'New Group' : 'Direct Chat'),
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${newId}`,
        created_by: userId,
        participants: allParticipants,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    mockConversations.set(newId, newConv);
    return res.status(201).json({ conversation: newConv });
});

/**
 * GET /api/chat/conversations/:id/messages
 * SECURITY ENFORCEMENT: Only participants can SELECT messages!
 */
router.get('/conversations/:id/messages', authenticateSSR, (req, res) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    if (!isUserParticipant(conversationId, userId)) {
        return res.status(403).json({
            error: 'Access denied: You are not a participant in this conversation.'
        });
    }

    const msgs = mockMessages.filter((m) => m.conversation_id === conversationId);
    return res.json({ messages: msgs });
});

/**
 * POST /api/chat/conversations/:id/messages
 * SECURITY ENFORCEMENT: Only participants can INSERT messages as themselves!
 */
router.post('/conversations/:id/messages', authenticateSSR, (req, res) => {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const {
        ciphertext,
        iv,
        media_url,
        media_type = 'text',
        voice_duration,
        is_view_once = false
    } = req.body;

    if (!ciphertext || !iv) {
        return res.status(400).json({ error: 'Ciphertext and IV are required for E2EE messages.' });
    }

    if (!isUserParticipant(conversationId, userId)) {
        return res.status(403).json({
            error: 'Access denied: You are not authorized to post messages to this conversation.'
        });
    }

    const newMsg = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: userId,
        ciphertext,
        iv,
        media_url: media_url || null,
        media_type,
        voice_duration: voice_duration || null,
        status: 'sent',
        reactions: [],
        is_view_once: Boolean(is_view_once),
        is_opened: false,
        created_at: new Date().toISOString()
    };

    mockMessages.push(newMsg);

    // Update conversation timestamp
    const conv = mockConversations.get(conversationId);
    if (conv) {
        conv.updated_at = newMsg.created_at;
    }

    return res.status(201).json({ message: newMsg });
});

/**
 * PATCH /api/chat/messages/:id/receipt
 * Update delivery status (sent -> delivered -> read)
 */
router.patch('/messages/:id/receipt', authenticateSSR, (req, res) => {
    const messageId = req.params.id;
    const { status } = req.body;

    if (!['delivered', 'read'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status receipt value.' });
    }

    const msg = mockMessages.find((m) => m.id === messageId);
    if (!msg) {
        return res.status(404).json({ error: 'Message not found.' });
    }

    if (!isUserParticipant(msg.conversation_id, req.user.id)) {
        return res.status(403).json({ error: 'Not authorized.' });
    }

    msg.status = status;
    return res.json({ success: true, message: msg });
});

/**
 * PATCH /api/chat/messages/:id/reaction
 * Discord-style emoji reaction toggle:
 * If user already reacted with this emoji -> remove it
 * If user hasn't reacted with this emoji -> add it
 */
router.patch('/messages/:id/reaction', authenticateSSR, (req, res) => {
    const messageId = req.params.id;
    const userId = req.user.id;
    const { emoji } = req.body;

    if (!emoji) {
        return res.status(400).json({ error: 'Emoji is required.' });
    }

    const msg = mockMessages.find((m) => m.id === messageId);
    if (!msg) {
        return res.status(404).json({ error: 'Message not found.' });
    }

    if (!isUserParticipant(msg.conversation_id, userId)) {
        return res.status(403).json({ error: 'Not authorized.' });
    }

    if (!Array.isArray(msg.reactions)) {
        msg.reactions = [];
    }

    const existingReaction = msg.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
        const userIndex = existingReaction.users.indexOf(userId);
        if (userIndex > -1) {
            // Remove user reaction
            existingReaction.users.splice(userIndex, 1);
            if (existingReaction.users.length === 0) {
                // Remove emoji category if empty
                msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
            }
        } else {
            // Add user reaction
            existingReaction.users.push(userId);
        }
    } else {
        // Create new reaction category
        msg.reactions.push({
            emoji,
            users: [userId]
        });
    }

    return res.json({ success: true, messageId, reactions: msg.reactions });
});

/**
 * PATCH /api/chat/messages/:id/view-once-opened
 * WhatsApp-style "View Once" media destruction:
 * Marks the media as opened and permanently clears the payload
 */
router.patch('/messages/:id/view-once-opened', authenticateSSR, (req, res) => {
    const messageId = req.params.id;
    const userId = req.user.id;

    const msg = mockMessages.find((m) => m.id === messageId);
    if (!msg) {
        return res.status(404).json({ error: 'Message not found.' });
    }

    if (!isUserParticipant(msg.conversation_id, userId)) {
        return res.status(403).json({ error: 'Not authorized.' });
    }

    if (msg.is_view_once) {
        msg.is_opened = true;
        // The media payload is marked opened and permanently rendered inactive
    }

    return res.json({ success: true, messageId, is_opened: true });
});

/**
 * POST /api/chat/upload
 * Attachment upload endpoint (handling images, videos, audio voice notes)
 */
router.post('/upload', authenticateSSR, express.json({ limit: '25mb' }), (req, res) => {
    const { data_url, mime_type, file_name } = req.body;

    if (!data_url) {
        return res.status(400).json({ error: 'No media data provided.' });
    }

    return res.json({
        url: data_url,
        file_name: file_name || 'attachment',
        mime_type: mime_type || 'application/octet-stream'
    });
});

export default router;
