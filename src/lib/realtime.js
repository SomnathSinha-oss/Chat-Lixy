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
            receipt: new Set()
        };
    }

    /**
     * Subscribe to conversation realtime events:
     * - New messages (postgres_changes)
     * - Typing indicators (broadcast)
     * - Read/delivered receipts (broadcast & postgres_changes)
     */
    joinConversation(conversationId, currentUser, onMessage, onTyping, onReceipt) {
        if (this.channel) {
            this.leaveConversation();
        }

        if (onMessage) this.subscribers.message.add(onMessage);
        if (onTyping) this.subscribers.typing.add(onTyping);
        if (onReceipt) this.subscribers.receipt.add(onReceipt);

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
                // Message status updates (delivered / read)
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
                    }
                )
                // Typing indicators via broadcast
                .on('broadcast', { event: 'typing' }, (payload) => {
                    this.subscribers.typing.forEach((cb) => cb(payload.payload));
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
    }

    /**
     * Broadcast typing indicator with auto debounce
     */
    sendTyping(conversationId, user, isTyping = true) {
        if (isSupabaseConfigured && this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: user.id,
                    display_name: user.display_name,
                    conversation_id: conversationId,
                    is_typing: isTyping,
                    timestamp: Date.now()
                }
            });
        } else {
            // Standalone broadcast notification
            this.subscribers.typing.forEach((cb) =>
                cb({
                    user_id: user.id,
                    display_name: user.display_name,
                    conversation_id: conversationId,
                    is_typing: isTyping,
                    timestamp: Date.now()
                })
            );
        }
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
            // Standalone simulated presence
            const mockOnline = new Set(['11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222', currentUser.id]);
            if (onPresenceSync) onPresenceSync(mockOnline);
        }
    }
}

export const realtime = new RealtimeManager();
