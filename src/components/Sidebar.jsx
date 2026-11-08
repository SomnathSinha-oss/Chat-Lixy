import { useState } from 'react';
import {
    MessageSquare,
    Search,
    Plus,
    Shield,
    LogOut,
    Lock,
    X,
    UserPlus,
    Phone
} from 'lucide-react';
import SecurityBadge from './SecurityBadge';

const defaultDemoUsers = [
    {
        id: '22222222-2222-4222-a222-222222222222',
        email: 'lexi@chatlixy.local',
        display_name: 'Lexi Nova',
        phone_number: '+1 (555) 014-9823',
        status: 'online',
        avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
    },
    {
        id: '33333333-3333-4333-a333-333333333333',
        email: 'elena@chatlixy.local',
        display_name: 'Elena Rostova',
        phone_number: '+1 (555) 017-4420',
        status: 'online',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    },
    {
        id: '44444444-4444-4444-a444-444444444444',
        email: 'marcus@chatlixy.local',
        display_name: 'Marcus Chen',
        phone_number: '+1 (555) 012-7744',
        status: 'offline',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
        id: '55555555-5555-4555-a555-555555555555',
        email: 'sophia@chatlixy.local',
        display_name: 'Dr. Sophia Al-Mansoor',
        phone_number: '+1 (555) 018-3391',
        status: 'online',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    },
    {
        id: '66666666-6666-4666-a666-666666666666',
        email: 'kai@chatlixy.local',
        display_name: 'Kai Sterling',
        phone_number: '+1 (555) 016-5512',
        status: 'away',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    }
];

export default function Sidebar({
    currentUser,
    conversations,
    activeConversationId,
    onSelectConversation,
    onCreateConversation,
    availableUsers,
    onlineUserIds,
    onLogout,
    isOpenMobile,
    onCloseMobile,
    onOpenProfile
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState('');
    const [chatType, setChatType] = useState('direct');
    const [groupName, setGroupName] = useState('');

    const contactOptions = (availableUsers && availableUsers.length > 0)
        ? availableUsers
        : defaultDemoUsers;

    const filteredConversations = conversations.filter((c) => {
        const query = searchQuery.toLowerCase();
        return (
            (c.name || '').toLowerCase().includes(query) ||
            (c.phone_number || '').toLowerCase().includes(query)
        );
    });

    const handleCreateChat = (e) => {
        e.preventDefault();
        if (chatType === 'direct' && selectedContactId) {
            onCreateConversation('direct', null, [selectedContactId]);
            setShowNewChatModal(false);
            setSelectedContactId('');
        } else if (chatType === 'group' && groupName.trim() && selectedContactId) {
            onCreateConversation('group', groupName.trim(), [selectedContactId]);
            setShowNewChatModal(false);
            setGroupName('');
            setSelectedContactId('');
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpenMobile && (
                <div
                    onClick={onCloseMobile}
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
                />
            )}

            <aside
                className={`fixed md:static inset-y-0 left-0 z-40 w-80 sm:w-88 flex flex-col bg-dark-surface border-r border-dark-border transition-transform duration-300 ease-in-out md:translate-x-0 ${
                    isOpenMobile ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Brand Header */}
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shadow-neon-green">
                            <MessageSquare className="w-5 h-5 fill-neon-green/20" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-extrabold tracking-tight text-white text-base">Chat</span>
                                <span className="font-extrabold tracking-tight text-neon-green text-base drop-shadow-[0_0_8px_#39FF14]">Lixy</span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono tracking-wide">SECURE MESSAGING</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <SecurityBadge user={currentUser} />
                        <button
                            onClick={onCloseMobile}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white md:hidden"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* User Status Bar */}
                {currentUser && (
                    <div className="px-4 py-3 bg-dark-base/40 border-b border-dark-border flex items-center justify-between">
                        <div
                            onClick={onOpenProfile}
                            className="flex items-center gap-2.5 cursor-pointer group"
                        >
                            <div className="relative">
                                <img
                                    src={currentUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email}`}
                                    alt={currentUser.display_name}
                                    className="w-8 h-8 rounded-full bg-dark-card border border-dark-border object-cover"
                                />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-dark-surface shadow-[0_0_6px_#39FF14]"></span>
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-semibold text-white group-hover:text-neon-green transition-colors">
                                    {currentUser.display_name}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[130px]">
                                    {currentUser.email}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="p-2 rounded-xl text-gray-300 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                                title="New Conversation"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-xl text-gray-400 hover:text-neon-red hover:bg-neon-red/10 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="p-3 border-b border-dark-border">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search chats or messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-dark-card border border-dark-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green/50 transition-all"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto divide-y divide-dark-border/40">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No conversations yet.<br />Click the <span className="text-neon-green font-semibold">+</span> button to start a chat.
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isActive = conv.id === activeConversationId;
                            // Check if other participant is online
                            const otherParticipantId = conv.participants?.find((p) => p !== currentUser?.id);
                            const isOnline = otherParticipantId ? onlineUserIds?.has(otherParticipantId) : false;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => {
                                        onSelectConversation(conv.id);
                                        if (onCloseMobile) onCloseMobile();
                                    }}
                                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-all duration-150 ${
                                        isActive
                                            ? 'bg-dark-hover border-l-4 border-l-neon-green shadow-sm'
                                            : 'hover:bg-dark-base/50 border-l-4 border-l-transparent'
                                    }`}
                                >
                                    <div className="relative shrink-0">
                                        <img
                                            src={conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`}
                                            alt={conv.name}
                                            className="w-10 h-10 rounded-xl bg-dark-card border border-dark-border object-cover"
                                        />
                                        {isOnline && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-dark-surface shadow-[0_0_8px_#39FF14]"></span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className="text-xs font-semibold text-white truncate">
                                                {conv.name || 'Direct Chat'}
                                            </h4>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {new Date(conv.updated_at || conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <span className="truncate flex items-center gap-1">
                                                <Lock className="w-2.5 h-2.5 text-neon-green shrink-0" />
                                                {conv.phone_number ? (
                                                    <span className="text-[10px] text-gray-400 font-mono">{conv.phone_number}</span>
                                                ) : (
                                                    'End-to-end encrypted'
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Security Assurance */}
                <div className="p-3 border-t border-dark-border text-center text-[10px] text-gray-500 flex items-center justify-center gap-1.5 font-mono">
                    <Shield className="w-3 h-3 text-neon-green" />
                    <span>RLS Protected &bull; STRIDE Verified</span>
                </div>
            </aside>

            {/* New Conversation Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-glass border border-dark-border relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowNewChatModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-neon-red transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Start New Chat</h3>
                                <p className="text-xs text-gray-400">Select a contact to initialize encrypted channel</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateChat} className="space-y-4">
                            {/* Chat Type Selector */}
                            <div className="flex rounded-xl bg-dark-base p-1 border border-dark-border">
                                <button
                                    type="button"
                                    onClick={() => setChatType('direct')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        chatType === 'direct'
                                            ? 'bg-neon-green text-dark-base shadow-neon-green'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Direct Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChatType('group')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        chatType === 'group'
                                            ? 'bg-neon-green text-dark-base shadow-neon-green'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Group Chat
                                </button>
                            </div>

                            {chatType === 'group' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">Group Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Core Security Team"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-xl bg-dark-card border border-dark-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Select Contact</label>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                                    {contactOptions
                                        .filter((u) => u.id !== currentUser?.id)
                                        .map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => setSelectedContactId(user.id)}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                    selectedContactId === user.id
                                                        ? 'bg-neon-green/10 border-neon-green text-white'
                                                        : 'bg-dark-card border-dark-border text-gray-300 hover:bg-dark-hover'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                                                        alt={user.display_name}
                                                        className="w-8 h-8 rounded-full bg-dark-base border border-dark-border object-cover"
                                                    />
                                                    <div>
                                                        <div className="text-xs font-semibold text-white">{user.display_name}</div>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                                            {user.phone_number && (
                                                                <span className="text-neon-green font-mono flex items-center gap-1">
                                                                    <Phone className="w-2.5 h-2.5" /> {user.phone_number}
                                                                </span>
                                                            )}
                                                            <span>&bull;</span>
                                                            <span>{user.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_6px_#39FF14]"></span>
                                                    <span className="text-[10px] text-neon-green">Online</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-dark-border">
                                <button
                                    type="button"
                                    onClick={() => setShowNewChatModal(false)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold btn-neon-red"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedContactId}
                                    className="px-4 py-1.5 rounded-xl text-xs font-semibold btn-neon-green disabled:opacity-40"
                                >
                                    Start Chat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
