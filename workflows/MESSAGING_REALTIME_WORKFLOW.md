# Real-Time Messaging & End-to-End Encryption (E2EE) Workflow

This document details the cryptographic flow, PostgreSQL Row Level Security (RLS) enforcement, Supabase Realtime event streaming, and Discord-style reaction handling.

---

## 1. End-to-End Message Encryption & Delivery Flowchart

```mermaid
flowchart TD
    subgraph SenderClient ["Sender Client (React 19)"]
        A1["User composes message or adds emoji"] --> A2["Client checks Conversation Key\n(Derived via PBKDF2 / ECDH P-256)"]
        A2 --> A3["Generate random 12-byte IV\n(window.crypto.getRandomValues)"]
        A3 --> A4["Encrypt plaintext via Web Crypto API\n(AES-256-GCM, 128-bit Tag)"]
        A4 --> A5["Produce Base64 Ciphertext + Base64 IV"]
        A5 --> A6["Dispatch POST /api/chat/conversations/:id/messages\n(HttpOnly cookies automatically attached)"]
    end

    subgraph NodeBackend ["Node.js Backend (:3001)"]
        B1["Verify SSR Session & Caller Identity"]
        B2["Validate caller is in participants list"]
        B3["Forward payload to PostgreSQL Data Plane"]
    end

    subgraph PostgreSQL ["PostgreSQL Database Engine"]
        C1{"RLS Policy Check on public.messages:\n1. auth.uid() = sender_id?\n2. auth.uid() IN participants?"}
        C1 -- "Unauthorized" --> C2["Reject with PostgreSQL RLS Exception (HTTP 403)"]
        C1 -- "Authorized" --> C3["INSERT into public.messages\n(status: 'sent')"]
        C3 --> C4["Trigger on_message_inserted:\nUpdate conversation updated_at"]
        C4 --> C5["Emit change to supabase_realtime publication"]
    end

    subgraph RealtimeEngine ["Supabase Realtime Engine (WebSockets)"]
        D1["Publish postgres_changes event to channel conversation:id"]
    end

    subgraph RecipientClient ["Recipient Client (React 19)"]
        E1["Receive Realtime Payload via WebSocket"]
        E2["Extract Base64 Ciphertext & IV"]
        E3["Pass to Web Crypto API (SubtleCrypto.decrypt)"]
        E4{"Verify 128-bit GCM Auth Tag"}
        E4 -- "Tag Mismatch / Tampered" --> E5["Throw Integrity Error & Flag Tampering"]
        E4 -- "Verified Clean" --> E6["Decode UTF-8 Plaintext & Render in Bubble"]
        E6 --> E7["Dispatch Status Receipt PATCH /messages/:id/receipt\n(status: 'read')"]
    end

    %% Connect graph
    A6 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> C1
    C5 --> D1
    D1 --> E1
    E7 -->|"Send Read Receipt (2 Neon Green Ticks)"| D1
```

---

## 2. Discord-Style Message Reactions Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Sender)
    actor Bob as Bob (Recipient)
    participant Node as Node.js Backend (:3001)
    participant Supabase as Supabase Database & Realtime

    Alice->>Bob: Encrypted Message ("Awesome security suite! 🔒")
    Bob->>Bob: Hover over message bubble -> Quick Reaction Toolbar appears
    Bob->>Node: PATCH /api/chat/messages/:id/reaction (Emoji: "🔥")
    Node->>Node: Toggle reaction for Bob's User ID in reactions JSONB
    Node->>Supabase: UPDATE public.messages SET reactions = '[{"emoji":"🔥", "users":["Bob_ID"]}]'
    Supabase-->>Alice: Realtime Broadcast (Event: 'reaction')
    Supabase-->>Bob: Realtime Broadcast (Event: 'reaction')
    Alice->>Alice: Display "🔥 1" pill with grey outline
    Bob->>Bob: Display "🔥 1" pill with Neon Green outline (Active User Reaction)
```

---

## 3. Delivery Receipt Ticks State Machine

```mermaid
stateDiagram-v2
    [*] --> Sent: Message inserted into database
    Sent --> Delivered: Recipient device receives realtime payload
    Delivered --> Read: Recipient opens conversation / scrolls into viewport
    
    state Sent {
        [*] --> SingleGreyTick: Render 1 Grey Checkmark (✓)
    }
    state Delivered {
        [*] --> DoubleGreyTicks: Render 2 Grey Checkmarks (✓✓)
    }
    state Read {
        [*] --> DoubleNeonGreenTicks: Render 2 Neon Green Checkmarks (✓✓ with #39FF14 glow)
    }
```
