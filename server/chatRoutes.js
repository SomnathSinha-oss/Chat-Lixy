import express from 'express';
import { authenticateSSR } from './supabaseServer.js';

const router = express.Router();

// In-memory conversation store for offline/standalone execution
const mockConversations = new Map([
    [
        '33333333-3333-4333-a333-333333333333',
        {
            id: '33333333-3333-4333-a333-333333333333',
            type: 'direct',
            name: 'Alex Vance & Lexi Nova',
            avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
            created_by: '11111111-1111-4111-a111-111111111111',
            participants: [
                '11111111-1111-4111-a111-111111111111',
                '22222222-2222-4222-a222-222222222222'
            ],
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date().toISOString()
        }
    ]
]);

const mockMessages = [
    {
        id: 'msg-001',
        conversation_id: '33333333-3333-4333-a333-333333333333',
        sender_id: '22222222-2222-4222-a222-222222222222',
        ciphertext: 'g2+6qH8oIq1k7ZJ0v3p8tL61/cO26oX92aZzZcZpI7A==',
        iv: 'MDEyMzQ1Njc4OWFi',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
        id: 'msg-002',
        conversation_id: '33333333-3333-4333-a333-333333333333',
        sender_id: '11111111-1111-4111-a111-111111111111',
        ciphertext: 'kP8v3m1q8T+V29J1wL8s0a3K/zX74nY50bVvWwXyZ8B==',
        iv: 'YWJjZGVmZ2hpamts',
        media_type: 'text',
        media_url: null,
        voice_duration: null,
        status: 'read',
        created_at: new Date(Date.now() - 900000).toISOString()
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
    const { ciphertext, iv, media_url, media_type = 'text', voice_duration } = req.body;

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
 * POST /api/chat/upload
 * Attachment upload endpoint (handling images, videos, audio voice notes)
 */
router.post('/upload', authenticateSSR, express.json({ limit: '25mb' }), (req, res) => {
    const { data_url, mime_type, file_name } = req.body;

    if (!data_url) {
        return res.status(400).json({ error: 'No media data provided.' });
    }

    // In a live Supabase environment, this uploads directly to 'chat-attachments' bucket via Storage RLS
    // In standalone mode, we echo or store the data URL
    return res.json({
        url: data_url,
        file_name: file_name || 'attachment',
        mime_type: mime_type || 'application/octet-stream'
    });
});

export default router;
