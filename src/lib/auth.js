const API_BASE = '/api';

/**
 * Standard fetch wrapper sending credentials (HttpOnly cookies) with every request
 */
async function fetchWithAuth(endpoint, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: defaultHeaders,
        credentials: 'include' // Sends HttpOnly Secure SameSite=Strict cookies
    });

    // Auto-refresh token if 401 received
    if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshRes.ok) {
            // Retry initial request with newly rotated token
            return fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: defaultHeaders,
                credentials: 'include'
            });
        }
    }

    return res;
}

export const authService = {
    async getSession() {
        try {
            const res = await fetchWithAuth('/auth/session');
            if (!res.ok) return null;
            const data = await res.json();
            return data.user;
        } catch (err) {
            console.error('Failed to get session:', err);
            return null;
        }
    },

    async login(email, password) {
        const res = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        return data.user;
    },

    async signup(email, password, display_name) {
        const res = await fetchWithAuth('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, display_name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        return data.user;
    },

    async logout() {
        const res = await fetchWithAuth('/auth/logout', {
            method: 'POST'
        });
        return res.ok;
    },

    async getUsers() {
        const res = await fetchWithAuth('/auth/users');
        if (!res.ok) return [];
        const data = await res.json();
        return data.users || [];
    },

    async updatePublicKey(publicKey) {
        const res = await fetchWithAuth('/auth/public-key', {
            method: 'POST',
            body: JSON.stringify({ public_key: publicKey })
        });
        return res.ok;
    },

    // Chat API
    async getConversations() {
        const res = await fetchWithAuth('/chat/conversations');
        if (!res.ok) return [];
        const data = await res.json();
        return data.conversations || [];
    },

    async createConversation(type, name, participant_ids) {
        const res = await fetchWithAuth('/chat/conversations', {
            method: 'POST',
            body: JSON.stringify({ type, name, participant_ids })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create conversation');
        return data.conversation;
    },

    async getMessages(conversationId) {
        const res = await fetchWithAuth(`/chat/conversations/${conversationId}/messages`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch messages');
        }
        const data = await res.json();
        return data.messages || [];
    },

    async sendMessage(conversationId, payload) {
        const res = await fetchWithAuth(`/chat/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send message');
        return data.message;
    },

    async markDeliveredOrRead(messageId, status) {
        const res = await fetchWithAuth(`/chat/messages/${messageId}/receipt`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        return res.ok;
    },

    async reactToMessage(messageId, emoji) {
        const res = await fetchWithAuth(`/chat/messages/${messageId}/reaction`, {
            method: 'PATCH',
            body: JSON.stringify({ emoji })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to react');
        return data.reactions;
    },

    async markViewOnceOpened(messageId) {
        const res = await fetchWithAuth(`/chat/messages/${messageId}/view-once-opened`, {
            method: 'PATCH'
        });
        return res.ok;
    },

    async uploadMedia(dataUrl, mimeType, fileName) {
        const res = await fetchWithAuth('/chat/upload', {
            method: 'POST',
            body: JSON.stringify({ data_url: dataUrl, mime_type: mimeType, file_name: fileName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data.url;
    }
};
