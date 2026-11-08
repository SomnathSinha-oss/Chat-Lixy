import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://demo-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key';

export const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://demo-project.supabase.co'
);

/**
 * Frontend Supabase Client
 * In SSR mode, authentication tokens are stored in HttpOnly cookies managed by the Node.js backend.
 * Realtime subscriptions utilize the anon key with authenticated user session.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // Prevents storing JWTs in localStorage to prevent XSS cookie theft
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    realtime: {
        params: {
            eventsPerSecond: 20
        }
    }
});

/**
 * Storage helper for attachments with RLS
 */
export async function uploadAttachment(file, path) {
    if (!isSupabaseConfigured) {
        // Fallback: Convert to data URL for standalone mode
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ path, publicUrl: reader.result });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

    return { path: data.path, publicUrl: urlData.publicUrl };
}
