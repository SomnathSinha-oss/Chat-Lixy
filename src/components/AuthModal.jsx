import { useState } from 'react';
import { Lock, Mail, Key, User, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import { authService } from '../lib/auth';

export default function AuthModal({ onAuthSuccess }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            let user;
            if (isSignUp) {
                user = await authService.signup(email, password, displayName);
            } else {
                user = await authService.login(email, password);
            }
            onAuthSuccess(user);
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    // Quick fill for demo users
    const handleQuickLogin = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
            <div className="glass-modal w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-glass border border-dark-border relative animate-in zoom-in-95 duration-200">
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green mx-auto mb-3 shadow-neon-green">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Chat<span className="text-neon-green drop-shadow-[0_0_8px_#39FF14]">Lixy</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                        High-Performance Real-Time Messaging &bull; E2EE Web Crypto
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex rounded-xl bg-dark-base p-1 border border-dark-border mb-5">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(false);
                            setError(null);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                            !isSignUp
                                ? 'bg-neon-green text-dark-base shadow-neon-green font-bold'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(true);
                            setError(null);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                            isSignUp
                                ? 'bg-neon-green text-dark-base shadow-neon-green font-bold'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 flex items-start gap-2 text-neon-red text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{error}</div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {isSignUp && (
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
                            <div className="relative">
                                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    placeholder="Your Full Name or Alias"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-card border border-dark-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            <input
                                type="email"
                                placeholder="name@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-card border border-dark-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                        <div className="relative">
                            <Key className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            <input
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-card border border-dark-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 mt-2 rounded-xl text-xs font-bold btn-neon-green flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : isSignUp ? 'Register Secure Account' : 'Authenticate Session'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                {/* Demo Accounts Quick Login */}
                {!isSignUp && (
                    <div className="mt-5 pt-4 border-t border-dark-border">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2 text-center">
                            Fast Demo Authentication
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('alex@chatlixy.local', 'Password123!')}
                                className="px-2.5 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-neon-green hover:border-neon-green/40 transition-colors"
                            >
                                Alex Vance
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('lexi@chatlixy.local', 'Password123!')}
                                className="px-2.5 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-neon-green hover:border-neon-green/40 transition-colors"
                            >
                                Lexi Nova
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('elena@chatlixy.local', 'Password123!')}
                                className="px-2.5 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-neon-green hover:border-neon-green/40 transition-colors"
                            >
                                Elena Rostova
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickLogin('sophia@chatlixy.local', 'Password123!')}
                                className="px-2.5 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-neon-green hover:border-neon-green/40 transition-colors"
                            >
                                Dr. Sophia
                            </button>
                        </div>
                    </div>
                )}

                {/* Security Footer Notice */}
                <div className="mt-5 text-center text-[10px] text-gray-500 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3 text-neon-green" />
                    <span>Protected by HttpOnly &bull; SameSite=Strict SSR Cookies</span>
                </div>
            </div>
        </div>
    );
}
