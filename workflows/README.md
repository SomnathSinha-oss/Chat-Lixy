# ChatLixy Full-Stack Architecture & Workflow Guide

This directory documents the technical workflows, cryptographic pipelines, and data interactions between the **Frontend (React.js)**, **Backend Utility Server (Node.js SSR)**, and **Database / Realtime Plane (Supabase PostgreSQL & Storage)**.

---

## 1. Master System End-to-End Workflow

The diagram below illustrates the end-to-end data lifecycle across all three architectural layers:

```mermaid
flowchart TD
    subgraph Client ["Frontend Layer (React 19 + Web Crypto)"]
        UI["User Interface (ChatLixy SPA)"]
        CryptoEngine["Web Crypto API (SubtleCrypto)"]
        RealtimeSub["Realtime Event Bus (Messages, Reactions, Presence)"]
    end

    subgraph Server ["Backend SSR Layer (Node.js / Express :3001)"]
        SecurityMW["Security Middleware (Helmet, CORS, Rate Limit)"]
        SSRAuth["SSR Auth Engine (HttpOnly Cookie Manager)"]
        RTR["Refresh Token Rotation (RTR Engine)"]
        ChatRouter["Chat & Utility Controller"]
    end

    subgraph DataPlane ["Database Plane (Supabase PostgreSQL :5432)"]
        AuthUsers["auth.users (Supabase Identity)"]
        PublicUsers["public.users (Profiles & Public Keys)"]
        Conversations["public.conversations"]
        Participants["public.participants"]
        Messages["public.messages"]
        RLS["PostgreSQL Kernel Row Level Security (RLS)"]
        RealtimePub["Supabase Realtime (Publication Engine)"]
        StorageBucket["Supabase Storage (chat-attachments Bucket)"]
    end

    %% Auth Flow
    UI -->|"1. Credentials (Login / Signup)"| SSRAuth
    SSRAuth -->|"2. Verify / Provision Identity"| AuthUsers
    AuthUsers -->|"3. Sync Profile Trigger"| PublicUsers
    SSRAuth -->|"4. Set-Cookie (HttpOnly, Secure, SameSite=Strict)"| UI

    %% Key Agreement & Encryption
    UI -->|"5. Derive AES-256-GCM Room Key"| CryptoEngine
    UI -->|"6. Encrypt Message Payload (IV + 128-bit Tag)"| CryptoEngine

    %% Message Mutation
    CryptoEngine -->|"7. Send Ciphertext + IV"| ChatRouter
    ChatRouter -->|"8. Forward Insert with Verified Session"| RLS
    RLS -->|"9. Strict Participant Validation"| Messages

    %% Realtime Delivery
    Messages -->|"10. Trigger postgres_changes (INSERT/UPDATE)"| RealtimePub
    RealtimePub -->|"11. WebSocket Zero-Latency Broadcast"| RealtimeSub
    RealtimeSub -->|"12. Decrypt Ciphertext with Local Key"| CryptoEngine
    CryptoEngine -->|"13. Render Message in UI"| UI

    %% Media & Storage
    UI -->|"14. Upload Encrypted Media / Attachment"| StorageBucket
```

---

## 2. Directory Index

Detailed domain-specific workflow diagrams are available in the following documents:

1. **[Authentication & Session Lifecycle (AUTH_WORKFLOW.md)](./AUTH_WORKFLOW.md)**  
   *Covers: SSR HttpOnly Cookie issuance, 15-minute Short-Lived JWT verification, Automated Refresh Token Rotation (RTR), and PostgreSQL Identity Binding.*

2. **[Real-Time Messaging & E2EE Pipeline (MESSAGING_REALTIME_WORKFLOW.md)](./MESSAGING_REALTIME_WORKFLOW.md)**  
   *Covers: Client Web Crypto AES-256-GCM encryption, PostgreSQL RLS participant validation, Supabase Realtime streaming, Discord-style emoji reactions, and receipt ticks.*

3. **[Media Attachments & WhatsApp-Style View Once (MEDIA_VIEW_ONCE_WORKFLOW.md)](./MEDIA_VIEW_ONCE_WORKFLOW.md)**  
   *Covers: File/Audio uploads to Storage, View Once photo masking, full-screen viewing session, and automatic post-view payload destruction.*

4. **[Database Schema & Entity Relationships (DATABASE_ERD.md)](./DATABASE_ERD.md)**  
   *Covers: PostgreSQL tables, relational constraints, foreign keys, and RLS security policies.*
