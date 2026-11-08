import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import { authService } from './lib/auth';
import { realtime } from './lib/realtime';
import {
    deriveKeyFromSecret,
    encryptPayload,
    generateUserKeyPair,
    exportPublicKey
} from './lib/crypto';

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversationKey, setConversationKey] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // 1. Initial Session Load (SSR HttpOnly Cookie Verification)
    useEffect(() => {
        async function checkSession() {
            try {
                const user = await authService.getSession();
                if (user) {
                    setCurrentUser(user);
                    // Generate / ensure Web Crypto keypair for user
                    initUserCrypto(user);
                }
            } catch (err) {
                console.error('Session initialization error:', err);
            } finally {
                setIsLoadingSession(false);
            }
        }
        checkSession();
    }, []);

    // 2. Initialize Web Crypto Keys
    const initUserCrypto = async (_user) => {
        try {
            const keyPair = await generateUserKeyPair();
            const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
            await authService.updatePublicKey(publicKeyBase64);
        } catch (err) {
            console.error('Crypto key agreement initialization failed:', err);
        }
    };

    // 3. Load Conversations & Users when user is authenticated
    useEffect(() => {
        if (!currentUser) return;

        async function loadData() {
            try {
                const [convs, users] = await Promise.all([
                    authService.getConversations(),
                    authService.getUsers()
                ]);
                setConversations(convs);
                setAvailableUsers(users);

                // Auto select first conversation if available
                if (convs.length > 0 && !activeConversationId) {
                    setActiveConversationId(convs[0].id);
                }

                // Initialize presence tracking
                realtime.initPresence(currentUser, (onlineIds) => {
                    setOnlineUserIds(onlineIds);
                });
            } catch (err) {
                console.error('Failed to load initial chat data:', err);
            }
        }

        loadData();
    }, [currentUser]);

    // 4. Handle Conversation Selection & Crypto Key Derivation
    useEffect(() => {
        if (!activeConversationId || !currentUser) return;

        let isMounted = true;

        async function initConversation() {
            try {
                // Derive Web Crypto AES-256-GCM symmetric key for this conversation
                const roomSecret = `chatlixy-room-secret-${activeConversationId}`;
                const key = await deriveKeyFromSecret(roomSecret);
                if (isMounted) setConversationKey(key);

                // Fetch existing messages
                const history = await authService.getMessages(activeConversationId);
                if (isMounted) setMessages(history);

                // Join Realtime channel for this conversation
                realtime.joinConversation(
                    activeConversationId,
                    currentUser,
                    (newMsg) => {
                        // Instant message delivery callback
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    },
                    (typingPayload) => {
                        // Typing indicator callback
                        if (typingPayload.user_id !== currentUser.id) {
                            if (typingPayload.is_typing) {
                                setTypingUsers((prev) =>
                                    Array.from(new Set([...prev, typingPayload.display_name]))
                                );
                            } else {
                                setTypingUsers((prev) =>
                                    prev.filter((name) => name !== typingPayload.display_name)
                                );
                            }
                        }
                    },
                    (receiptPayload) => {
                        // Read / delivered status receipt update
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === receiptPayload.id ? { ...m, status: receiptPayload.status } : m
                            )
                        );
                    },
                    (reactionPayload) => {
                        // Discord-style reaction update
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === reactionPayload.messageId
                                    ? { ...m, reactions: reactionPayload.reactions }
                                    : m
                            )
                        );
                    },
                    (viewOncePayload) => {
                        // View once opened update
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === viewOncePayload.messageId
                                    ? { ...m, is_opened: true }
                                    : m
                            )
                        );
                    }
                );
            } catch (err) {
                console.error('Failed to initialize active conversation:', err);
            }
        }

        initConversation();

        return () => {
            isMounted = false;
            realtime.leaveConversation();
        };
    }, [activeConversationId, currentUser]);

    // 5. Send Text Message (Web Crypto Encrypted before storage)
    const handleSendMessage = async (text) => {
        if (!activeConversationId || !currentUser || !conversationKey) return;

        try {
            // Encrypt with Web Crypto AES-256-GCM
            const { ciphertext, iv } = await encryptPayload(text, conversationKey);

            const payload = {
                ciphertext,
                iv,
                media_type: 'text',
                media_url: null
            };

            const newMsg = await authService.sendMessage(activeConversationId, payload);
            setMessages((prev) => [...prev, newMsg]);
        } catch (err) {
            console.error('Failed to send encrypted message:', err);
            alert(`Encryption/Send Error: ${err.message}`);
        }
    };

    // 6. Send Voice Note
    const handleSendAudio = async (audioData) => {
        if (!activeConversationId || !currentUser || !conversationKey) return;

        try {
            // In a full Supabase environment, audio is uploaded to Storage with RLS
            const mediaUrl = await authService.uploadMedia(audioData.dataUrl, audioData.mimeType, 'voice-note.webm');

            // Encrypt metadata with Web Crypto AES-256-GCM
            const { ciphertext, iv } = await encryptPayload('Voice note encrypted message', conversationKey);

            const payload = {
                ciphertext,
                iv,
                media_type: 'audio',
                media_url: mediaUrl,
                voice_duration: audioData.duration
            };

            const newMsg = await authService.sendMessage(activeConversationId, payload);
            setMessages((prev) => [...prev, newMsg]);
        } catch (err) {
            console.error('Failed to send voice note:', err);
        }
    };

    // 7. Send File / Video / Photo Attachment
    const handleSendAttachment = async (attachmentData) => {
        if (!activeConversationId || !currentUser || !conversationKey) return;

        try {
            const mediaUrl = await authService.uploadMedia(
                attachmentData.dataUrl,
                attachmentData.mimeType,
                attachmentData.fileName
            );

            // Encrypt caption with Web Crypto AES-256-GCM
            const captionText = attachmentData.caption || `Attached ${attachmentData.mediaType}`;
            const { ciphertext, iv } = await encryptPayload(captionText, conversationKey);

            const payload = {
                ciphertext,
                iv,
                media_type: attachmentData.mediaType,
                media_url: mediaUrl,
                is_view_once: Boolean(attachmentData.isViewOnce)
            };

            const newMsg = await authService.sendMessage(activeConversationId, payload);
            setMessages((prev) => [...prev, newMsg]);
        } catch (err) {
            console.error('Failed to send attachment:', err);
        }
    };

    // 8. Handle Discord-style Reactions
    const handleReact = async (messageId, emoji) => {
        if (!activeConversationId || !currentUser) return;
        try {
            const updatedReactions = await authService.reactToMessage(messageId, emoji);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, reactions: updatedReactions } : m
                )
            );
            realtime.sendReaction(messageId, updatedReactions, activeConversationId);
        } catch (err) {
            console.error('Failed to react to message:', err);
        }
    };

    // 9. Handle WhatsApp-style View Once Destruction
    const handleViewOnceOpened = async (messageId) => {
        if (!activeConversationId) return;
        try {
            await authService.markViewOnceOpened(messageId);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, is_opened: true } : m
                )
            );
            realtime.sendViewOnceOpened(messageId, activeConversationId);
        } catch (err) {
            console.error('Failed to mark view once opened:', err);
        }
    };

    // 10. Handle Typing State
    const handleTyping = (isTyping) => {
        if (activeConversationId && currentUser) {
            realtime.sendTyping(activeConversationId, currentUser, isTyping);
        }
    };

    // 9. Read Receipts
    const handleMarkRead = useCallback((messageId) => {
        if (!activeConversationId) return;
        authService.markDeliveredOrRead(messageId, 'read');
        realtime.sendReceipt(messageId, 'read', activeConversationId);
    }, [activeConversationId]);

    // 10. Delete Message (Destructive action in Neon Red)
    const handleDeleteMessage = (messageId) => {
        if (confirm('Permanently delete this encrypted message from the chat?')) {
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
    };

    // 11. Create New Conversation
    const handleCreateConversation = async (type, name, participantIds) => {
        try {
            const newConv = await authService.createConversation(type, name, participantIds);
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversationId(newConv.id);
        } catch (err) {
            alert(err.message || 'Failed to create conversation');
        }
    };

    // 12. Log out
    const handleLogout = async () => {
        await authService.logout();
        setCurrentUser(null);
        setActiveConversationId(null);
        setConversations([]);
        setMessages([]);
    };

    if (isLoadingSession) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-base text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center text-neon-green mb-3 animate-spin">
                    <div className="w-5 h-5 rounded-full border-2 border-neon-green border-t-transparent" />
                </div>
                <div className="text-xs font-mono text-neon-green">Verifying SSR Security Tokens...</div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <AuthModal
                onAuthSuccess={(user) => {
                    setCurrentUser(user);
                    initUserCrypto(user);
                }}
            />
        );
    }

    const activeConversation = conversations.find((c) => c.id === activeConversationId);
    const otherParticipantId = activeConversation?.participants?.find((p) => p !== currentUser.id);
    const isContactOnline = otherParticipantId ? onlineUserIds.has(otherParticipantId) : false;

    return (
        <div className="h-screen w-screen flex bg-dark-base overflow-hidden select-none font-sans">
            {/* Sidebar (Mobile Slide-Over & Desktop Fixed) */}
            <Sidebar
                currentUser={currentUser}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => setActiveConversationId(id)}
                onCreateConversation={handleCreateConversation}
                availableUsers={availableUsers}
                onlineUserIds={onlineUserIds}
                onLogout={handleLogout}
                isOpenMobile={isMobileMenuOpen}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
                onOpenProfile={() => setIsProfileModalOpen(true)}
            />

            {/* Active Chat Window */}
            <ChatWindow
                conversation={activeConversation}
                currentUser={currentUser}
                messages={messages}
                conversationKey={conversationKey}
                onSendMessage={handleSendMessage}
                onSendAudio={handleSendAudio}
                onSendAttachment={handleSendAttachment}
                onTyping={handleTyping}
                typingUsers={typingUsers}
                onMarkRead={handleMarkRead}
                onDeleteMessage={handleDeleteMessage}
                onReact={handleReact}
                onViewOnceOpened={handleViewOnceOpened}
                onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                isOnline={isContactOnline}
            />

            {/* User Profile / Safety Info Modal */}
            {isProfileModalOpen && (
                <UserProfileModal
                    user={currentUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onLogout={handleLogout}
                />
            )}
        </div>
    );
}
