import { useRef, useEffect } from 'react';
import {
    Menu,
    Phone,
    Video,
    Lock,
    Shield
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SecurityBadge from './SecurityBadge';

export default function ChatWindow({
    conversation,
    currentUser,
    messages,
    conversationKey,
    onSendMessage,
    onSendAudio,
    onSendAttachment,
    onTyping,
    typingUsers,
    onMarkRead,
    onDeleteMessage,
    onReact,
    onViewOnceOpened,
    onOpenMobileMenu,
    isOnline
}) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-dark-base text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center text-neon-green mb-4 shadow-neon-green">
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Active Conversation</h2>
                <p className="text-sm text-gray-400 max-w-sm">
                    Select an existing conversation from the sidebar or start a new encrypted direct chat.
                </p>
                <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-card border border-dark-border text-xs text-gray-400 font-mono">
                    <Shield className="w-3.5 h-3.5 text-neon-green" />
                    Row-Level Security &bull; End-to-End Encrypted
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-dark-base relative overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="px-4 py-3 bg-dark-surface/90 backdrop-blur-md border-b border-dark-border flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    {/* Mobile Hamburger Menu */}
                    <button
                        onClick={onOpenMobileMenu}
                        className="p-2 rounded-xl text-gray-400 hover:text-white md:hidden hover:bg-dark-hover transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="relative">
                        <img
                            src={conversation.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`}
                            alt={conversation.name}
                            className="w-10 h-10 rounded-xl bg-dark-card border border-dark-border object-cover"
                        />
                        {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-dark-surface shadow-[0_0_8px_#39FF14]"></span>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{conversation.name || 'Chat'}</h3>
                            <Lock className="w-3 h-3 text-neon-green" title="E2EE Active" />
                        </div>
                        <div className="text-[11px] flex items-center gap-1.5">
                            {typingUsers && typingUsers.length > 0 ? (
                                <span className="text-neon-green font-semibold animate-pulse">
                                    {typingUsers.join(', ')} is typing...
                                </span>
                            ) : isOnline ? (
                                <span className="text-neon-green font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block"></span>
                                    Online
                                </span>
                            ) : (
                                <span className="text-gray-400">Encrypted Channel</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => alert('Secure Voice Calling utilizes WebRTC with DTLS-SRTP encryption.')}
                        className="p-2 rounded-xl text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                        title="Encrypted Voice Call"
                    >
                        <Phone className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => alert('Secure Video Calling utilizes WebRTC with DTLS-SRTP encryption.')}
                        className="p-2 rounded-xl text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                        title="Encrypted Video Call"
                    >
                        <Video className="w-4 h-4" />
                    </button>
                    <SecurityBadge conversationKey={conversationKey} user={currentUser} />
                </div>
            </div>

            {/* Cryptographic Assurance Banner */}
            <div className="px-4 py-2 bg-dark-surface/50 border-b border-dark-border/60 flex items-center justify-center gap-2 text-center">
                <Shield className="w-3.5 h-3.5 text-neon-green shrink-0" />
                <span className="text-[11px] text-gray-400">
                    Messages are end-to-end encrypted with <strong className="text-gray-200">Web Crypto AES-256-GCM</strong>.
                    No one outside this chat, not even Supabase, can read them.
                </span>
            </div>

            {/* Message Stream Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                        <Lock className="w-10 h-10 mb-3 text-neon-green/40" />
                        <p className="text-xs font-medium text-gray-400">This is the start of your encrypted conversation.</p>
                        <p className="text-[11px] text-gray-500 mt-1">Send a message or voice note to begin chatting.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOutgoing={msg.sender_id === currentUser?.id}
                            currentUser={currentUser}
                            conversationKey={conversationKey}
                            onDelete={onDeleteMessage}
                            onMarkRead={onMarkRead}
                            onReact={onReact}
                            onViewOnceOpened={onViewOnceOpened}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Rich Message Input Bar */}
            <MessageInput
                onSendMessage={onSendMessage}
                onSendAudio={onSendAudio}
                onSendAttachment={onSendAttachment}
                onTyping={onTyping}
            />
        </div>
    );
}
