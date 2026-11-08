# Database Schema & Entity-Relationship Diagram (ERD)

This document provides the PostgreSQL relational model, schema constraints, and Row Level Security (RLS) enforcement rules for **ChatLixy**.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    AUTH_USERS ||--o| PUBLIC_USERS : "1-to-1 sync via trigger"
    PUBLIC_USERS ||--o{ PARTICIPANTS : "joins"
    PUBLIC_USERS ||--o{ CONVERSATIONS : "creates"
    PUBLIC_USERS ||--o{ MESSAGES : "sends"

    CONVERSATIONS ||--|{ PARTICIPANTS : "contains"
    CONVERSATIONS ||--o{ MESSAGES : "hosts"

    AUTH_USERS {
        uuid id PK
        string email
        string encrypted_password
        timestamp created_at
    }

    PUBLIC_USERS {
        uuid id PK,FK "references auth.users(id)"
        string email UK
        string display_name
        string phone_number
        string avatar_url
        string public_key "ECDH P-256 E2EE Public Key"
        string status "online | offline | away"
        timestamp last_seen
        timestamp created_at
        timestamp updated_at
    }

    CONVERSATIONS {
        uuid id PK
        string type "direct | group"
        string name "group name or null for direct"
        string avatar_url
        uuid created_by FK "references auth.users(id)"
        timestamp created_at
        timestamp updated_at
    }

    PARTICIPANTS {
        uuid id PK
        uuid conversation_id FK "references conversations(id)"
        uuid user_id FK "references auth.users(id)"
        string role "admin | member"
        string encrypted_conversation_key
        timestamp joined_at
        timestamp last_read_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK "references conversations(id)"
        uuid sender_id FK "references auth.users(id)"
        text ciphertext "AES-256-GCM encrypted payload"
        string iv "12-byte random IV base64"
        string media_url "Storage bucket path"
        string media_type "text | image | video | audio | document"
        float voice_duration "duration in seconds"
        string status "sent | delivered | read"
        jsonb reactions "Discord-style reaction array"
        boolean is_view_once "WhatsApp-style View Once flag"
        boolean is_opened "View Once destruction status"
        boolean is_deleted "soft delete flag"
        timestamp created_at
        timestamp updated_at
    }
```

---

## 2. Row Level Security (RLS) Matrix

| Table | Policy Name | Permitted Roles | SQL Definition / Predicate |
| :--- | :--- | :--- | :--- |
| `public.users` | Authenticated users can view profiles | `authenticated` | `SELECT USING (true)` |
| `public.users` | Users can update their own profile | `authenticated` | `UPDATE USING (auth.uid() = id)` |
| `public.conversations` | Users can view conversations they participate in | `authenticated` | `SELECT USING (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = conversations.id AND user_id = auth.uid()))` |
| `public.conversations` | Authenticated users can create conversations | `authenticated` | `INSERT WITH CHECK (auth.uid() = created_by)` |
| `public.participants` | Users can view participants of their conversations | `authenticated` | `SELECT USING (EXISTS (SELECT 1 FROM public.participants p2 WHERE p2.conversation_id = participants.conversation_id AND p2.user_id = auth.uid()))` |
| **`public.messages`** | **Users can select messages only in participating conversations** | **`authenticated`** | **`SELECT USING (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()))`** |
| **`public.messages`** | **Users can insert messages only in participating conversations as themselves** | **`authenticated`** | **`INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()))`** |
| `public.messages` | Participants can update message receipts & reactions | `authenticated` | `UPDATE USING (EXISTS (SELECT 1 FROM public.participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()))` |
