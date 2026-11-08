import { X, Key, LogOut, Ban, Phone } from 'lucide-react';

export default function UserProfileModal({ user, onClose, onLogout }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-glass border border-dark-border relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center pb-4 border-b border-dark-border">
                    <div className="relative mb-3">
                        <img
                            src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                            alt={user.display_name}
                            className="w-16 h-16 rounded-full bg-dark-card border-2 border-neon-green/40 object-cover shadow-neon-green"
                        />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-neon-green border-2 border-dark-surface"></span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{user.display_name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{user.email}</p>
                    {user.phone_number && (
                        <p className="text-xs text-neon-green font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {user.phone_number}
                        </p>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neon-green/10 text-neon-green text-[11px] font-medium border border-neon-green/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green"></span>
                        Active Session (SSR Cookie Protected)
                    </div>
                </div>

                {/* Cryptographic Key Details */}
                <div className="py-4 space-y-3">
                    <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                        <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                            <span className="flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-neon-green" /> E2EE Key Fingerprint
                            </span>
                            <span className="text-[10px] text-neon-green font-mono">ECDH P-256</span>
                        </div>
                        <div className="p-2 rounded-lg bg-dark-base font-mono text-[10px] text-gray-300 break-all select-all border border-dark-border/40">
                            94A1 82FE 39C4 B710 44DF 0192 882E 55AB 90C1 2284 39FF 1400
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-surface border border-dark-border flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-white">Refresh Token Rotation</div>
                            <div className="text-[10px] text-gray-400">Automatic RTR every 15 minutes</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-mono font-bold">
                            ACTIVE
                        </span>
                    </div>
                </div>

                {/* Destructive Actions & Sign Out */}
                <div className="pt-2 border-t border-dark-border space-y-2">
                    <button
                        onClick={() => alert('User blocked from direct message delivery and RLS participant checks.')}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold btn-neon-red flex items-center justify-center gap-2"
                    >
                        <Ban className="w-4 h-4" /> Block Suspicious Users
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-dark-hover hover:bg-dark-border text-white flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out of Session
                    </button>
                </div>
            </div>
        </div>
    );
}
