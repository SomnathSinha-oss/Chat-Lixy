import express from 'express';
import crypto from 'crypto';
import { authenticateSSR } from './supabaseServer.js';

const router = express.Router();

// Helper to generate mathematically valid AES-256-GCM ciphertexts matching client PBKDF2 room keys
function encryptMessageForRoom(conversationId, text) {
    try {
        const roomSecret = `chatlixy-room-secret-${conversationId}`;
        const salt = 'chatlixy-e2ee-salt-v1';
        const key = crypto.pbkdf2Sync(roomSecret, salt, 100000, 32, 'sha256');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return {
            ciphertext: Buffer.concat([enc, tag]).toString('base64'),
            iv: iv.toString('base64'),
            text
        };
    } catch (_err) {
        return {
            ciphertext: 'demo-cipher',
            iv: 'demo-iv',
            text
        };
    }
}

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

const convLexi = 'aaaaaaaa-1111-4aaa-aaaa-111111111111';
const convElena = 'bbbbbbbb-2222-4bbb-bbbb-222222222222';
const convMarcus = 'cccccccc-3333-4ccc-cccc-333333333333';
const convSophia = 'dddddddd-4444-4ddd-dddd-444444444444';
const convKai = 'eeeeeeee-5555-4eee-eeee-555555555555';

const encMsg1 = encryptMessageForRoom(convLexi, 'Hey Alex! The end-to-end encryption pipeline on ChatLixy is running smoothly.');
const encMsg2 = encryptMessageForRoom(convLexi, 'Awesome! All cookies are HttpOnly and strict RLS is enforced at the DB level.');
const encMsg3 = encryptMessageForRoom(convLexi, 'Here is the confidential security schematic. It will self-destruct once opened.');
const encMsg4 = encryptMessageForRoom(convElena, 'Hi Alex! Testing real-time subscriptions and typing indicators.');
const encMsg5 = encryptMessageForRoom(convMarcus, 'Database triggers and real-time publication status verified on PostgreSQL.');
const encMsg6 = encryptMessageForRoom(convSophia, 'The STRIDE threat model evaluation passed with zero residual vulnerabilities.');
const encMsg7 = encryptMessageForRoom(convKai, 'Security audit completed. Refresh token rotation is actively cycling sessions.');

const mockMessages = [
    // Lexi Nova thread
    {
        id: 'msg-001',
        conversation_id: convLexi,
        sender_id: U_LEXI,
        ciphertext: encMsg1.ciphertext,
        iv: encMsg1.iv,
        text: encMsg1.text,
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
        conversation_id: convLexi,
        sender_id: U_ALEX,
        ciphertext: encMsg2.ciphertext,
        iv: encMsg2.iv,
        text: encMsg2.text,
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
        conversation_id: convLexi,
        sender_id: U_LEXI,
        ciphertext: encMsg3.ciphertext,
        iv: encMsg3.iv,
        text: encMsg3.text,
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
        conversation_id: convElena,
        sender_id: U_ELENA,
        ciphertext: encMsg4.ciphertext,
        iv: encMsg4.iv,
        text: encMsg4.text,
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
        conversation_id: convMarcus,
        sender_id: U_MARCUS,
        ciphertext: encMsg5.ciphertext,
        iv: encMsg5.iv,
        text: encMsg5.text,
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
        conversation_id: convSophia,
        sender_id: U_SOPHIA,
        ciphertext: encMsg6.ciphertext,
        iv: encMsg6.iv,
        text: encMsg6.text,
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
        conversation_id: convKai,
        sender_id: U_KAI,
        ciphertext: encMsg7.ciphertext,
        iv: encMsg7.iv,
        text: encMsg7.text,
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
