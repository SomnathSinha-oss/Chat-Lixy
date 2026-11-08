import { useState, useEffect, useRef } from 'react';
import { Check, CheckCheck, Play, Pause, Lock, Trash2, ShieldAlert } from 'lucide-react';
import { decryptPayload } from '../lib/crypto';

export default function MessageBubble({
    message,
    isOutgoing,
    conversationKey,
    onDelete,
    onMarkRead
}) {
    const [decryptedText, setDecryptedText] = useState(null);
    const [decryptionError, setDecryptionError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [showCryptoDetails, setShowCryptoDetails] = useState(false);

    const audioRef = useRef(null);

    // Decrypt ciphertext using Web Crypto AES-256-GCM
    useEffect(() => {
        let isMounted = true;

        async function decrypt() {
            if (!message.ciphertext || !message.iv) {
                setDecryptedText(message.text || '');
                return;
            }

            try {
                if (conversationKey) {
                    const text = await decryptPayload(message.ciphertext, message.iv, conversationKey);
                    if (isMounted) {
                        setDecryptedText(text);
                        setDecryptionError(false);
                    }
                } else {
                    // Fallback preview while key is deriving
                    setDecryptedText(message.text || 'Encrypted Message');
                }
            } catch (_err) {
                if (isMounted) {
                    setDecryptionError(true);
                    setDecryptedText('[Encrypted message - Integrity verification failed]');
                }
            }
        }

        decrypt();

        // If message is incoming and unread, trigger read receipt
        if (!isOutgoing && message.status !== 'read' && onMarkRead) {
            onMarkRead(message.id);
        }

        return () => {
            isMounted = false;
        };
    }, [message.ciphertext, message.iv, conversationKey]);

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
        <div className={`flex flex-col mb-3 group ${isOutgoing ? 'items-end' : 'items-start'}`}>
            <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm transition-all duration-200 border ${
                    isOutgoing
                        ? 'bg-dark-sent text-gray-100 border-neon-green/20 hover:border-neon-green/40'
                        : 'bg-dark-card text-gray-100 border-dark-border hover:border-gray-700'
                }`}
            >
                {/* Media Attachment: Image */}
                {message.media_type === 'image' && message.media_url && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-72">
                        <img
                            src={message.media_url}
                            alt="Attachment"
                            className="w-full h-auto object-cover rounded-xl hover:scale-[1.01] transition-transform cursor-pointer"
                            onClick={() => window.open(message.media_url, '_blank')}
                        />
                    </div>
                )}

                {/* Media Attachment: Video */}
                {message.media_type === 'video' && message.media_url && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-72">
                        <video
                            src={message.media_url}
                            controls
                            className="w-full max-h-72 rounded-xl"
                        />
                    </div>
                )}

                {/* Media Attachment: Voice Note */}
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
                            {/* Waveform track */}
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

                {/* Text Content */}
                {decryptedText && message.media_type !== 'audio' && (
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
        </div>
    );
}
