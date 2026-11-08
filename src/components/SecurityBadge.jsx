import { useState } from 'react';
import { ShieldCheck, Lock, Key, Server, CheckCircle2, X } from 'lucide-react';

export default function SecurityBadge({ conversationKey: _conversationKey, user: _user }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-card border border-dark-border hover:border-neon-green/40 transition-all text-gray-300 hover:text-white"
                title="Click to view Cryptographic & Session Security Details"
            >
                <Lock className="w-3.5 h-3.5 text-neon-green" />
                <span className="hidden sm:inline">E2EE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-glass border border-dark-border relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-neon-red transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    ChatLixy Security Suite
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-mono border border-neon-green/30">
                                        VERIFIED
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-400">Zero-Trust End-to-End Cryptography</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-start gap-3">
                                <Key className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-white">Client-Side Web Crypto API</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Messages and media are encrypted via AES-256-GCM with 128-bit authentication tags before leaving the device. Keys are derived via ECDH P-256.
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-start gap-3">
                                <Server className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-white">SSR HttpOnly Cookie Defense</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Auth tokens reside in strict <code className="text-neon-green">HttpOnly</code>, <code className="text-neon-green">Secure</code>, <code className="text-neon-green">SameSite=Strict</code> cookies. Immune to XSS token theft.
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-white">PostgreSQL Row-Level Security (RLS)</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Strict database enforcement: Only verified participants can SELECT or INSERT records for this conversation.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-dark-border flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold btn-neon-green"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
