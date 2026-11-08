import { useState, useEffect, useRef } from 'react';
import {
    Check,
    CheckCheck,
    Play,
    Pause,
    Lock,
    Trash2,
    ShieldAlert,
    Smile,
    X,
    EyeOff
} from 'lucide-react';
import { decryptPayload } from '../lib/crypto';

export default function MessageBubble({
    message,
    isOutgoing,
    currentUser,
    conversationKey,
    onDelete,
    onMarkRead,
    onReact,
    onViewOnceOpened
}) {
    const [decryptedText, setDecryptedText] = useState(null);
    const [decryptionError, setDecryptionError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [showCryptoDetails, setShowCryptoDetails] = useState(false);
    const [showViewOnceModal, setShowViewOnceModal] = useState(false);
    const [showQuickReactions, setShowQuickReactions] = useState(false);

    const audioRef = useRef(null);
    const quickEmojis = ['👍', '❤️', '🔥', '😂', '🚀', '🔒'];

    // Decrypt ciphertext using Web Crypto AES-256-GCM
    useEffect(() => {
        let isMounted = true;

        async function decrypt() {
            if (!message.ciphertext || !message.iv) {
                setDecryptedText(message.text || '');
                return;
            }

            try {
                if (conversationKey && message.ciphertext && message.iv) {
                    const text = await decryptPayload(message.ciphertext, message.iv, conversationKey);
                    if (isMounted) {
                        setDecryptedText(text);
                        setDecryptionError(false);
                    }
                } else if (message.text || message.plaintext) {
                    setDecryptedText(message.text || message.plaintext);
                    setDecryptionError(false);
                } else {
                    setDecryptedText('Encrypted Message');
                }
            } catch (_err) {
                if (isMounted) {
                    if (message.text || message.plaintext) {
                        setDecryptedText(message.text || message.plaintext);
                        setDecryptionError(false);
                    } else {
                        setDecryptionError(true);
                        setDecryptedText('[Encrypted message - Integrity verification failed]');
                    }
                }
            }
        }

        decrypt();

        if (!isOutgoing && message.status !== 'read' && onMarkRead) {
            onMarkRead(message.id);
        }

        return () => {
            isMounted = false;
        };
    }, [message.ciphertext, message.iv, conversationKey, isOutgoing, message.id, message.status, onMarkRead, message.text]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleAudioTimeUpdate = () => {
        if (audioRef.current && audioRef.current.duration) {
            setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
    };

    const formatTimestamp = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleCloseViewOnce = () => {
        setShowViewOnceModal(false);
        if (onViewOnceOpened) {
            onViewOnceOpened(message.id);
        }
    };

    // Render receipt ticks
    const renderReceipt = () => {
        if (!isOutgoing) return null;

        if (message.status === 'read') {
            return (
                <span title="Read by recipient" className="flex items-center text-neon-green">
                    <CheckCheck className="w-3.5 h-3.5 drop-shadow-[0_0_4px_#39FF14]" />
                </span>
            );
        }

        if (message.status === 'delivered') {
            return (
                <span title="Delivered to device" className="flex items-center text-gray-400">
                    <CheckCheck className="w-3.5 h-3.5" />
                </span>
            );
        }

        return (
            <span title="Sent to server" className="flex items-center text-gray-500">
                <Check className="w-3.5 h-3.5" />
            </span>
        );
    };

    return (
        <div className={`flex flex-col mb-3 group relative ${isOutgoing ? 'items-end' : 'items-start'}`}>
            {/* Discord-style Hover Quick Reaction Toolbar */}
            <div
                className={`absolute -top-7 ${
                    isOutgoing ? 'right-2' : 'left-2'
                } z-20 hidden group-hover:flex items-center gap-0.5 px-2 py-1 rounded-xl glass-panel shadow-glass border border-dark-border/80 transition-all`}
            >
                {quickEmojis.map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => onReact && onReact(message.id, emoji)}
                        className="p-1 text-sm hover:scale-125 transition-transform"
                        title={`React with ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setShowQuickReactions(!showQuickReactions)}
                    className="p-1 text-gray-400 hover:text-neon-green transition-colors"
                    title="Add reaction"
                >
                    <Smile className="w-3.5 h-3.5" />
                </button>
            </div>

            <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm transition-all duration-200 border ${
                    isOutgoing
                        ? 'bg-dark-sent text-gray-100 border-neon-green/20 hover:border-neon-green/40'
                        : 'bg-dark-card text-gray-100 border-dark-border hover:border-gray-700'
                }`}
            >
                {/* 1. WhatsApp-style "View Once" Media Container */}
                {message.is_view_once && (
                    <div className="mb-2">
                        {message.is_opened ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-base/60 border border-dark-border/40 text-gray-500 select-none">
                                <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center text-[10px] font-bold">
                                    1
                                </div>
                                <span className="text-xs font-medium">Opened</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowViewOnceModal(true)}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-dark-base border border-neon-green/50 hover:border-neon-green text-gray-100 hover:text-white transition-all text-left group/vo shadow-sm w-full"
                            >
                                <div className="w-7 h-7 rounded-full border-2 border-neon-green text-neon-green flex items-center justify-center text-xs font-black shadow-neon-green">
                                    1
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <span>Photo</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-mono font-bold">
                                            VIEW ONCE
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 truncate">Tap to open image once</div>
                                </div>
                            </button>
                        )}
                    </div>
                )}

                {/* 2. Standard Media Attachment: Image (non-view-once) */}
                {!message.is_view_once && message.media_type === 'image' && message.media_url && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-72">
                        <img
                            src={message.media_url}
                            alt="Attachment"
                            className="w-full h-auto object-cover rounded-xl hover:scale-[1.01] transition-transform cursor-pointer"
                            onClick={() => window.open(message.media_url, '_blank')}
                        />
                    </div>
                )}

                {/* 3. Media Attachment: Video */}
                {message.media_type === 'video' && message.media_url && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-72">
                        <video
                            src={message.media_url}
                            controls
                            className="w-full max-h-72 rounded-xl"
                        />
                    </div>
                )}

                {/* 4. Media Attachment: Voice Note */}
                {message.media_type === 'audio' && message.media_url && (
                    <div className="flex items-center gap-3 p-1 min-w-[220px]">
                        <button
                            onClick={handlePlayPause}
                            className={`p-2.5 rounded-full transition-all ${
                                isOutgoing
                                    ? 'bg-neon-green text-dark-base hover:bg-neon-green/90 shadow-neon-green'
                                    : 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20'
                            }`}
                        >
                            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>

                        <div className="flex-1">
                            <div className="relative h-2 bg-dark-base rounded-full overflow-hidden">
                                <div
                                    className="absolute top-0 bottom-0 left-0 bg-neon-green transition-all duration-100"
                                    style={{ width: `${audioProgress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                                <span>Voice Note</span>
                                <span>{message.voice_duration ? `${Math.round(message.voice_duration)}s` : '0:05'}</span>
                            </div>
                        </div>

                        <audio
                            ref={audioRef}
                            src={message.media_url}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onEnded={() => {
                                setIsPlaying(false);
                                setAudioProgress(0);
                            }}
                            className="hidden"
                        />
                    </div>
                )}

                {/* 5. Decrypted Text Content */}
                {decryptedText && message.media_type !== 'audio' && !message.is_view_once && (
                    <div className={`text-sm break-words whitespace-pre-wrap ${decryptionError ? 'text-neon-red font-mono' : ''}`}>
                        {decryptionError && <ShieldAlert className="w-4 h-4 inline mr-1 text-neon-red" />}
                        {decryptedText}
                    </div>
                )}

                {/* Metadata Footer: Timestamp + Security Lock + Receipt ticks */}
                <div className="flex items-center justify-end gap-1.5 mt-1.5 select-none">
                    <button
                        onClick={() => setShowCryptoDetails(!showCryptoDetails)}
                        title="View AES-256-GCM Verification Data"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-neon-green"
                    >
                        <Lock className="w-3 h-3" />
                    </button>

                    <span className="text-[10px] text-gray-400 font-mono">
                        {formatTimestamp(message.created_at)}
                    </span>

                    {renderReceipt()}

                    {/* Delete Message Button (Neon Red) */}
                    {isOutgoing && onDelete && (
                        <button
                            onClick={() => onDelete(message.id)}
                            title="Delete message"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-neon-red ml-1"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Cryptographic Details Drawer */}
                {showCryptoDetails && (
                    <div className="mt-2 pt-2 border-t border-dark-border text-[10px] font-mono text-gray-400 space-y-1 bg-dark-base/40 p-2 rounded-lg">
                        <div className="text-neon-green font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> AES-256-GCM Verified Payload
                        </div>
                        <div className="truncate">
                            <span className="text-gray-500">IV:</span> {message.iv || 'None'}
                        </div>
                        <div className="truncate">
                            <span className="text-gray-500">Ciphertext:</span> {message.ciphertext || 'None'}
                        </div>
                    </div>
                )}
            </div>

            {/* Discord-style Reaction Badges underneath Bubble */}
            {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {message.reactions.map((r) => {
                        const hasReacted = currentUser && r.users?.includes(currentUser.id);
                        return (
                            <button
                                key={r.emoji}
                                type="button"
                                onClick={() => onReact && onReact(message.id, r.emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                                    hasReacted
                                        ? 'bg-neon-green/15 border border-neon-green text-white shadow-[0_0_6px_rgba(57,255,20,0.3)]'
                                        : 'bg-dark-card border border-dark-border text-gray-300 hover:bg-dark-hover'
                                }`}
                                title={`Reactions: ${r.users?.length || 0}`}
                            >
                                <span>{r.emoji}</span>
                                <span className="text-[10px] font-mono font-bold">{r.users?.length || 0}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* WhatsApp-style View Once Fullscreen Modal */}
            {showViewOnceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="relative max-w-2xl w-full flex flex-col items-center">
                        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-dark-border text-gray-300">
                            <div className="flex items-center gap-2 text-neon-green text-xs font-bold">
                                <span className="w-5 h-5 rounded-full border-2 border-neon-green flex items-center justify-center text-[10px]">1</span>
                                <EyeOff className="w-4 h-4" />
                                <span>View Once Photo (Permanently deleted on close)</span>
                            </div>
                            <button
                                onClick={handleCloseViewOnce}
                                className="px-3 py-1.5 rounded-xl btn-neon-red text-xs font-semibold flex items-center gap-1.5"
                            >
                                <X className="w-4 h-4" /> Close & Destroy
                            </button>
                        </div>
                        <img
                            src={message.media_url}
                            alt="View Once Photo"
                            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-glass border border-neon-green/30"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
