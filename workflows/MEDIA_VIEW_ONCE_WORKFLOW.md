# Media Attachments & WhatsApp-Style "View Once" Workflow

This document details the lifecycle of encrypted media attachments and the **WhatsApp-Style View Once self-destructing photo mechanism**.

---

## 1. "View Once" Media Upload & Destruction Flowchart

```mermaid
flowchart TD
    subgraph SenderAction ["Sender Device (Alice)"]
        S1["Alice clicks Paperclip Attachment icon"] --> S2["Selects Image file from local disk"]
        S2 --> S3["Attachment Modal opens with Preview"]
        S3 --> S4["Alice clicks (1) View Once button\n(Active state highlighted in Neon Green #39FF14)"]
        S4 --> S5["Alice clicks Send"]
        S5 --> S6["Client encrypts file / caption via Web Crypto AES-256-GCM"]
        S6 --> S7["Uploads to Supabase Storage 'chat-attachments'"]
        S7 --> S8["Dispatches POST /api/chat/conversations/:id/messages\n(is_view_once: true, is_opened: false)"]
    end

    subgraph DataPlane ["Database Plane (PostgreSQL & Supabase Storage)"]
        D1["Store media object in bucket with RLS"]
        D2["Insert message row in public.messages:\nis_view_once = true, is_opened = false"]
        D3["Emit postgres_changes event to conversation channel"]
    end

    subgraph RecipientAction ["Recipient Device (Bob)"]
        R1["Bob receives realtime message notification"]
        R2{"Check is_view_once & is_opened flags"}
        
        R2 -- "is_opened = false" --> R3["Mask Image Content:\nRender WhatsApp-style Badge [ (1) Photo - VIEW ONCE ]"]
        R2 -- "is_opened = true" --> R4["Render Dimmed Inactive Badge: [ (1) Opened ]\n(Image completely blocked and unloaded)"]
        
        R3 --> R5["Bob clicks on [ (1) Photo ] badge"]
        R5 --> R6["Open Fullscreen Glassmorphic Modal Viewer\nDisplay decrypted image with destruction notice"]
        R6 --> R7["Bob closes viewer or taps 'Close & Destroy'"]
        
        R7 --> R8["1. Immediately unload image from browser memory\n2. Call PATCH /api/chat/messages/:id/view-once-opened\n3. Broadcast view_once_opened event"]
    end

    %% Flow transitions
    S8 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> R1
    R8 -->|"Update Database Record"| D2
    D2 -->|"Broadcast update to Alice & Bob"| D3
    D3 --> R4
```

---

## 2. Security Boundaries of View Once Media

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Sender)
    actor Bob as Bob (Recipient)
    participant Node as Node.js Backend (:3001)
    participant DB as PostgreSQL (public.messages)

    Alice->>Bob: Dispatches View Once Photo (is_view_once: true, is_opened: false)
    Note over Bob: UI displays: [ (1) Photo - VIEW ONCE ]<br/>Image not shown in chat stream
    Bob->>Bob: Clicks badge -> Opens Fullscreen Viewer
    Note over Bob: Bob views photo
    Bob->>Bob: Clicks "Close & Destroy"
    Bob->>Node: PATCH /api/chat/messages/:id/view-once-opened
    Node->>DB: UPDATE public.messages SET is_opened = true WHERE id = message_id
    DB-->>Node: Update confirmed
    Node-->>Alice: Realtime broadcast (is_opened: true)
    Node-->>Bob: Realtime broadcast (is_opened: true)
    Note over Alice,Bob: Both UIs permanently transition badge to [ (1) Opened ]<br/>Payload can never be viewed again
```
