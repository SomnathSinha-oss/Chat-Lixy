# ChatLixy: STRIDE Threat Model & Session Security Evaluation

**Document Version:** 1.0.0  
**Target Application:** ChatLixy High-Performance Messaging Platform  
**Target Environment:** React.js (Frontend), Node.js Express (SSR Auth & Backend Utilities), Supabase (PostgreSQL, Auth, Storage, Realtime)  
**Security Mandate:** Strict Row Level Security (RLS), Web Crypto API AES-256-GCM E2EE, SSR `HttpOnly` / `Secure` / `SameSite=Strict` Cookies, Automatic Refresh Token Rotation (RTR).

---

## 1. System Architecture & Trust Boundaries

The ChatLixy application enforces a **Zero-Trust Client Boundary** and a **Cryptographic Defense-in-Depth Model**.

```
+---------------------------------------------------------------------------------------+
| CLIENT DEVICE (Browser Sandbox)                                                      |
|  - React 19 UI Engine (Strict Dark Mode #0B0E14, Neon Accents #39FF14 & #FF3131)     |
|  - Web Crypto API (SubtleCrypto: AES-256-GCM, ECDH P-256)                            |
|  - In-memory Key Store (Zero persistence of plaintext in localStorage/IndexedDB)     |
+---------------------------------------+-----------------------------------------------+
                                        | (HTTPS / TLS 1.3 Only)
                                        | HttpOnly, Secure, SameSite=Strict Cookies
                                        v
+---------------------------------------------------------------------------------------+
| NODE.JS SSR AUTH & UTILITY BOUNDARY (Port 3001)                                      |
|  - Helmet HTTP Security Headers (CSP, HSTS, frameguard, noSniff)                     |
|  - Express Rate Limiting (Brute-force & credential stuffing defense)                  |
|  - Automatic Refresh Token Rotation (RTR Engine - 15m JWT / 7d Rotated Refresh Token)|
|  - SSR Cookie Injector & Token Validation Middleware                                 |
+---------------------------------------+-----------------------------------------------+
                                        | (Internal Secure Connection)
                                        v
+---------------------------------------------------------------------------------------+
| SUPABASE / POSTGRESQL DATA PLANE (Kernel Level Security)                             |
|  - PostgREST & Auth Engine (Claims verification & token signature validation)        |
|  - Row Level Security (RLS) Policies on users, conversations, participants, messages |
|  - Supabase Realtime Engine (postgres_changes publication with RLS filtering)        |
|  - Supabase Storage (Encrypted file attachments with bucket-level RLS)                |
+---------------------------------------------------------------------------------------+
```

---

## 2. STRIDE Threat Model Evaluation

| STRIDE Category | Threat Description | Severity | ChatLixy Architectural Mitigation | Verification / Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **S - Spoofing** | Adversary attempts to forge caller identity or alter `sub` / `user_id` inside a JWT to bypass Supabase RLS. | **CRITICAL** | Asymmetric signature verification (RS256/ES256) enforced at the PostgREST and SSR server boundary. Any tampering immediately invalidates the cryptographic signature. PostgreSQL assigns `auth.uid()` directly from the cryptographic token claims—callers cannot inject a custom `auth.uid()`. Furthermore, the message INSERT policy enforces `auth.uid() = sender_id`. | **VERIFIED.** Spoofed tokens are rejected with HTTP 401. Unauthorized identity injection is mathematically impossible without the Supabase Auth private signing key. |
| **T - Tampering** | Adversary intercepts and tampers with message payloads, ciphertext, or conversation metadata in-flight. | **HIGH** | 1. Transport Layer: Mandatory TLS 1.3 via strict HSTS headers (`includeSubDomains; preload`).<br>2. Application Layer: End-to-End Encryption utilizing Web Crypto API `AES-256-GCM` with 128-bit authentication tags and unique 12-byte initialization vectors (`iv`). Modifying even one bit of ciphertext fails GCM authentication tag verification and is discarded. | **VERIFIED.** GCM decryption automatically throws a cryptographic authentication exception if payload is modified. |
| **R - Repudiation** | A sender denies dispatching a specific message or participating in a thread. | **MEDIUM** | Messages table records immutable cryptographic timestamps (`created_at TIMESTAMPTZ DEFAULT NOW()`), unique random message UUIDs, and foreign-key bound `sender_id`. Combined with ECDH public key fingerprints registered during account creation, non-repudiation is strictly maintained. | **VERIFIED.** Message records in PostgreSQL cannot be retroactively backdated or reassigned to a different sender due to RLS write policies. |
| **I - Information Disclosure** | Malicious scripts (XSS), rogue extensions, or unauthorized network queries attempt to read messages or exfiltrate tokens. | **CRITICAL** | 1. **Session Cookie Isolation:** Session tokens are delivered strictly in `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. Client-side JavaScript cannot read or extract JWTs.<br>2. **PostgreSQL RLS Filtering:** Direct table queries are restricted to users present in `participants` table.<br>3. **Zero-Knowledge Storage:** Supabase database only holds ciphertext. The server never sees plaintext messages or encryption keys. | **VERIFIED.** XSS cookie theft vector is eliminated by `HttpOnly`. Unauthorized database queries return empty sets `[]` due to RLS. |
| **D - Denial of Service** | Volumetric authentication flooding, rapid session creation, or oversized media uploads to exhaust server resources. | **HIGH** | 1. `express-rate-limit` enforces 30 requests/15 minutes per IP on `/api/auth` endpoints and 200 requests/minute on general API.<br>2. Supabase Realtime enforces 20 events/sec per channel.<br>3. Attachment size hard-capped at 25MB with strict MIME validation. | **VERIFIED.** Rate limiter returns HTTP 429 when thresholds are reached, preserving system throughput. |
| **E - Elevation of Privilege** | A standard conversation member attempts to alter group metadata, delete others' messages, or join uninvited chats. | **HIGH** | 1. RLS UPDATE policy on `messages` restricts status mutations to delivered/read.<br>2. DELETE policy restricts message removal to `auth.uid() = sender_id`.<br>3. Participant table INSERT policy requires the caller to be conversation creator or designated admin. | **VERIFIED.** RLS policies execute in the PostgreSQL kernel, preventing API client bypass. |

---

## 3. Row-Level Security (RLS) Deep Dive

### Security Mandate:
> *"A user must only be able to SELECT or INSERT messages if their user_id exists in the participants table for that specific conversation."*

### Mathematical RLS Proof:

#### 1. SELECT Enforcement:
```sql
CREATE POLICY "Users can select messages only in participating conversations"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    );
```
*Proof:* If User $U_k \notin \text{Participants}(C_m)$, the subquery returns empty, evaluating the `USING` condition to `FALSE`. PostgreSQL drops the record before returning results to PostgREST.

#### 2. INSERT Enforcement:
```sql
CREATE POLICY "Users can insert messages only in participating conversations as themselves"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.participants
            WHERE participants.conversation_id = messages.conversation_id
              AND participants.user_id = auth.uid()
        )
    );
```
*Proof:* 
1. Caller identity spoofing check: `auth.uid() = sender_id`. If User $A$ attempts to insert with `sender_id = B`, the check fails.
2. Participant authorization check: $U_A \in \text{Participants}(C_m)$. If User $A$ attempts to send a message into conversation $C_x$ where they are not a participant, the check fails. Both conditions are required conjunctions (`AND`).

---

## 4. Session Security & Refresh Token Rotation (RTR)

### Cookie Security Attributes:
| Cookie Name | Purpose | Flags | Expiration |
| :--- | :--- | :--- | :--- |
| `sb-access-token` | Short-lived API authorization | `HttpOnly; Secure; SameSite=Strict; Path=/` | 15 minutes (900s) |
| `sb-refresh-token` | Long-lived rolling token | `HttpOnly; Secure; SameSite=Strict; Path=/` | 7 days (604800s) |

### Refresh Token Rotation Flow:
```
[Client Request] --> Cookies: [sb-access-token (Expired), sb-refresh-token (Valid)]
       |
       v
[Node.js SSR Middleware]
       |
       +--> Verifies refresh token against Supabase Auth / Cryptographic Secret
       +--> Revokes previous refresh token (preventing replay attacks)
       +--> Generates fresh Access Token (15 min) + New Rotated Refresh Token (7 days)
       +--> Sets updated Set-Cookie headers:
       |      Set-Cookie: sb-access-token=<new_jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
       |      Set-Cookie: sb-refresh-token=<new_rtr>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
       v
[Continues Request Execution without client disruption]
```

---

## 5. End-to-End Encryption (E2EE) Specification

- **Algorithm:** AES-256-GCM (`SubtleCrypto` standard)
- **Key Derivation:** ECDH (P-256) Key Agreement combined with PBKDF2 (100,000 iterations, SHA-256)
- **Initialization Vector:** 12 random bytes cryptographically generated per message (`window.crypto.getRandomValues`)
- **Authentication Tag:** 128-bit authentication tag appended to ciphertext
- **Zero-Knowledge Guarantee:** The plain message and voice recordings are encrypted on the client device prior to network transmission. Supabase receives solely base64-encoded ciphertext and IVs.
