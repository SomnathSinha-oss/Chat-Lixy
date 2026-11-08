# Authentication & Session Security Workflow

This workflow details the **Server-Side Rendering (SSR) Authentication Pattern**, the **HttpOnly Cookie Mandate**, and the **Automatic Refresh Token Rotation (RTR)** architecture.

---

## 1. Authentication & Cookie Lifecycle Flowchart

```mermaid
flowchart TD
    Start(["User submits login / signup form"]) --> ClientSend["Browser sends credentials via HTTPS POST to /api/auth/login"]
    
    subgraph ExpressBackend ["Node.js SSR Backend (:3001)"]
        RateCheck{"Rate Limit Check (<30 req / 15m)"}
        RateCheck -- "Exceeded" --> RateReject["Return HTTP 429 Too Many Requests"]
        RateCheck -- "Permitted" --> AuthValidate{"Validate Credentials against Supabase Auth"}
        
        AuthValidate -- "Invalid" --> AuthReject["Return HTTP 401 Unauthorized"]
        AuthValidate -- "Valid" --> IssueTokens["Generate Token Pair:\n1. Short-Lived JWT Access Token (15 min)\n2. Long-Lived Refresh Token (7 days)"]
        
        IssueTokens --> CookieInjector["Set Set-Cookie Headers:\n- sb-access-token (HttpOnly, Secure, SameSite=Strict, MaxAge=900s)\n- sb-refresh-token (HttpOnly, Secure, SameSite=Strict, MaxAge=604800s)"]
    end

    ClientSend --> RateCheck
    CookieInjector --> ClientCookieStored["Browser stores HttpOnly cookies in Secure Jar\n(JavaScript CANNOT read cookies)"]
    
    subgraph SubsequentRequests ["Subsequent API Calls (e.g. GET /api/chat/conversations)"]
        BrowserRequest["Browser automatically attaches cookies:\nCookie: sb-access-token=...; sb-refresh-token=..."]
        SSRMiddleware{"authenticateSSR Middleware Check"}
        
        TokenValid{"Is Access Token Valid & Non-Expired?"}
        TokenValid -- "Yes" --> ExtractClaims["Extract caller claims (id, email)\nInject req.user into request"]
        ExtractClaims --> ExecuteDB["Execute query in Supabase / PostgreSQL\nPostgreSQL sets auth.uid()"]
        
        TokenValid -- "Expired (< 15 min old)" --> CheckRefreshToken{"Is Refresh Token Valid?"}
        CheckRefreshToken -- "No" --> ClearCookies["Clear Cookies & Return HTTP 401"]
        CheckRefreshToken -- "Yes (RTR Triggered)" --> RotateToken["Automatic Refresh Token Rotation:\n1. Invalidate old refresh token\n2. Issue new Access Token (15m)\n3. Issue new Refresh Token (7d)\n4. Send updated Set-Cookie headers"]
        RotateToken --> ExecuteDB
    end

    ClientCookieStored --> BrowserRequest
    BrowserRequest --> SSRMiddleware
    SSRMiddleware --> TokenValid
```

---

## 2. Refresh Token Rotation (RTR) Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Node as Node.js SSR Backend (:3001)
    participant Auth as Supabase Auth / JWT Engine
    participant DB as PostgreSQL (RLS Engine)

    User->>Node: GET /api/chat/conversations (Cookie: sb-access-token [EXPIRED])
    Node->>Node: Verify sb-access-token (ExpiredError)
    Node->>Node: Check sb-refresh-token presence
    Node->>Auth: Exchange refresh_token for new session
    Auth-->>Node: Returns fresh Access Token + Rotated Refresh Token
    Node->>DB: Query conversations with new session (auth.uid())
    DB-->>Node: Filtered user conversations
    Node->>User: HTTP 200 OK + Set-Cookie (sb-access-token [NEW], sb-refresh-token [NEW])
    Note over User,Node: Session continues uninterrupted without user re-login
```

---

## 3. Security Boundary Guarantees

| Security Property | Architectural Mechanism | Impact |
| :--- | :--- | :--- |
| **XSS Immunity** | `HttpOnly: true` on all authentication cookies | Malicious injected client scripts cannot access session tokens. |
| **CSRF Defense** | `SameSite: Strict` cookie flag | Cookies are only transmitted when requests originate from ChatLixy origin. |
| **Network Sniffing Defense** | `Secure: true` flag & TLS 1.3 | Cookies are never sent across unencrypted plaintext HTTP channels. |
| **Replay Attack Defense** | Refresh Token Rotation (RTR) | Used refresh tokens are immediately revoked; reuse attempts trigger instant session invalidation. |
