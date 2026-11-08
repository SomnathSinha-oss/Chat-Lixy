import { supabase, isSupabaseConfigured } from './supabaseClient';

class RealtimeManager {
    constructor() {
        this.channel = null;
        this.presenceChannel = null;
        this.typingTimeout = null;
        this.subscribers = {
            message: new Set(),
            typing: new Set(),
            presence: new Set(),
            receipt: new Set(),
            reaction: new Set(),
            viewOnce: new Set()
        };
    }

    /**
     * Subscribe to conversation realtime events:
     * - New messages (postgres_changes)
     * - Status & reaction updates (postgres_changes & broadcast)
     * - Typing indicators (broadcast)
     * - View Once media opened (broadcast)
     */
    joinConversation(
        conversationId,
        _currentUser,
        onMessage,
        onTyping,
        onReceipt,
        onReaction,
        onViewOnce
    ) {
        if (this.channel) {
            this.leaveConversation();
        }

        if (onMessage) this.subscribers.message.add(onMessage);
        if (onTyping) this.subscribers.typing.add(onTyping);
        if (onReceipt) this.subscribers.receipt.add(onReceipt);
        if (onReaction) this.subscribers.reaction.add(onReaction);
        if (onViewOnce) this.subscribers.viewOnce.add(onViewOnce);

        if (isSupabaseConfigured) {
            this.channel = supabase.channel(`conversation:${conversationId}`, {
                config: { broadcast: { self: false } }
            })
                // Instant message delivery via postgres_changes
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`
                    },
                    (payload) => {
                        this.subscribers.message.forEach((cb) => cb(payload.new));
                    }
                )
                // Message status & reaction updates
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`
                    },
                    (payload) => {
                        this.subscribers.receipt.forEach((cb) => cb(payload.new));
                        if (payload.new.reactions) {
                            this.subscribers.reaction.forEach((cb) =>
                                cb({ messageId: payload.new.id, reactions: payload.new.reactions })
                            );
                        }
                        if (payload.new.is_opened) {
                            this.subscribers.viewOnce.forEach((cb) =>
                                cb({ messageId: payload.new.id, is_opened: true })
                            );
                        }
                    }
                )
                // Typing indicators via broadcast
                .on('broadcast', { event: 'typing' }, (payload) => {
                    this.subscribers.typing.forEach((cb) => cb(payload.payload));
                })
                // Realtime reactions via broadcast
                .on('broadcast', { event: 'reaction' }, (payload) => {
                    this.subscribers.reaction.forEach((cb) => cb(payload.payload));
                })
                // Realtime view once opened notification
                .on('broadcast', { event: 'view_once_opened' }, (payload) => {
                    this.subscribers.viewOnce.forEach((cb) => cb(payload.payload));
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Realtime] Subscribed to conversation:${conversationId}`);
                    }
                });
        }
    }

    leaveConversation() {
        if (this.channel) {
            if (isSupabaseConfigured) {
                supabase.removeChannel(this.channel);
            }
            this.channel = null;
        }
        this.subscribers.message.clear();
        this.subscribers.typing.clear();
        this.subscribers.receipt.clear();
        this.subscribers.reaction.clear();
        this.subscribers.viewOnce.clear();
    }

    /**
     * Broadcast typing indicator with auto debounce
     */
    sendTyping(conversationId, user, isTyping = true) {
        const payload = {
            user_id: user.id,
            display_name: user.display_name,
            conversation_id: conversationId,
            is_typing: isTyping,
            timestamp: Date.now()
        };

        if (isSupabaseConfigured && this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'typing',
                payload
            });
        }
        this.subscribers.typing.forEach((cb) => cb(payload));
    }

    /**
     * Broadcast message receipt update
     */
    sendReceipt(messageId, status, conversationId) {
        if (isSupabaseConfigured && this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'receipt',
                payload: { message_id: messageId, status, conversation_id: conversationId }
            });
        }
        this.subscribers.receipt.forEach((cb) =>
            cb({ id: messageId, status, conversation_id: conversationId })
        );
    }

    /**
     * Broadcast Discord-style reaction
     */
    sendReaction(messageId, reactions, conversationId) {
        const payload = { messageId, reactions, conversationId };
        if (isSupabaseConfigured && this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'reaction',
                payload
            });
        }
        this.subscribers.reaction.forEach((cb) => cb(payload));
    }

    /**
     * Broadcast View Once opened event
     */
    sendViewOnceOpened(messageId, conversationId) {
        const payload = { messageId, is_opened: true, conversationId };
        if (isSupabaseConfigured && this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'view_once_opened',
                payload
            });
        }
        this.subscribers.viewOnce.forEach((cb) => cb(payload));
    }

    /**
     * Track user presence (online/offline status)
     */
    initPresence(currentUser, onPresenceSync) {
        if (!currentUser) return;

        if (this.presenceChannel && isSupabaseConfigured) {
            supabase.removeChannel(this.presenceChannel);
        }

        if (isSupabaseConfigured) {
            this.presenceChannel = supabase.channel('online-users');

            this.presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.presenceChannel.presenceState();
                    const onlineUserIds = new Set();
                    Object.values(state).forEach((presences) => {
                        presences.forEach((p) => onlineUserIds.add(p.user_id));
                    });
                    if (onPresenceSync) onPresenceSync(onlineUserIds);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await this.presenceChannel.track({
                            user_id: currentUser.id,
                            display_name: currentUser.display_name,
                            online_at: new Date().toISOString()
                        });
                    }
                });
        } else {
            // Standalone simulated presence (all demo contacts active)
            const mockOnline = new Set([
                '11111111-1111-4111-a111-111111111111',
                '22222222-2222-4222-a222-222222222222',
                '33333333-3333-4333-a333-333333333333',
                '55555555-5555-4555-a555-555555555555',
                currentUser.id
            ]);
            if (onPresenceSync) onPresenceSync(mockOnline);
        }
    }
}

export const realtime = new RealtimeManager();
