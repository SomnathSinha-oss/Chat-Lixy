# ChatLixy: High-Performance Secure Messaging Platform

[![Security: STRIDE Evaluated](https://img.shields.io/badge/Security-STRIDE%20Verified-39FF14.svg)](#)
[![E2EE: Web Crypto AES-256-GCM](https://img.shields.io/badge/E2EE-Web%20Crypto%20AES--256--GCM-39FF14.svg)](#)
[![Auth: SSR HttpOnly Cookies](https://img.shields.io/badge/Auth-SSR%20HttpOnly%20Strict-39FF14.svg)](#)
[![Database: Supabase RLS](https://img.shields.io/badge/Database-Supabase%20RLS-39FF14.svg)](#)

ChatLixy is a production-grade, real-time messaging web application built with **React.js**, **Node.js SSR utilities**, and **Supabase** for database, authentication, and real-time streaming. It incorporates a Zero-Trust client cryptographic boundary, strict PostgreSQL Row-Level Security (RLS), and a modern strict dark mode UI with cyber-neon branding.

---

## 🌟 Key Features

### 1. Database & SSR Authentication (Supabase)
- **Database Architecture:** Schemas for `users`, `conversations`, `participants`, and `messages`.
- **SSR Cookie Security Mandate:** All authentication tokens are issued in `HttpOnly`, `Secure`, and `SameSite=Strict` cookies to eliminate XSS cookie theft and session hijacking.
- **Refresh Token Rotation (RTR):** Short-lived access JWTs (15-minute expiration) with automated rolling refresh tokens (7 days).
- **Strict Row-Level Security (RLS):** Kernel-level PostgreSQL policies ensuring a user can **only SELECT or INSERT messages** if their `user_id` exists in the `participants` table for that specific conversation.

### 2. Real-Time Core Features
- **Supabase Realtime Subscriptions:** Instant message streaming via `postgres_changes` on the `messages` table.
- **WhatsApp / Telegram Standard Features:**
  - Real-time **typing indicators** with automatic broadcast debouncing.
  - Multi-state **read/delivered receipts** (1 tick = sent, 2 grey ticks = delivered, 2 neon green ticks = read).
  - Online **presence status** tracking.
  - **Image & Video attachments** preview and uploads using Supabase Storage with RLS.
  - High-fidelity **Voice Notes** powered by HTML5 `MediaRecorder` API, real-time waveform visualization, and inline playback.
- **End-to-End Encryption (E2EE):** Cryptographic encryption prior to storage or transmission using the browser **Web Crypto API** (`SubtleCrypto`):
  - Symmetric encryption: **AES-256-GCM** with 128-bit authentication tags and unique 12-byte initialization vectors (`iv`).
  - Asymmetric key agreement: **ECDH (P-256)** and deterministic key derivation via **PBKDF2 (SHA-256)**.
  - Cryptographic safety numbers and fingerprint verification.

### 3. Advanced UI / UX
- **Strict Dark Mode:** Root background `#0B0E14`, sidebar `#101522`, chat bubbles `#161D2E` (received) and `#0D2B16` (sent).
- **Color Psychology Branding:**
  - **Neon Green (`#39FF14`):** Positive actions (send button, online presence, read receipts, active status).
  - **Neon Red (`#FF3131`):** Alerts, errors, and destructive actions (delete message, discard recording, block user, disconnect).
- **Modern Glassmorphism:** Translucent modal overlays with `backdrop-filter: blur(16px)`, animated waveforms, and mobile-first responsive slide-over sidebars.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The app runs out-of-the-box with built-in simulated SSR & E2EE demo fallbacks if live Supabase keys are not supplied).*

### 3. Run the Development Servers
In two terminal tabs:
```bash
# Terminal 1: Node.js SSR Backend Utility Server (Port 3001)
npm run server

# Terminal 2: Vite React Frontend (Port 5173)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛡️ Security Audit & agents-cli

ChatLixy includes the `agents-cli` binary tool to audit component syntax and verify security boundaries:

```bash
# Verify component syntax, RLS policies, and SSR cookie mandates
agents-cli lint

# Review the STRIDE threat model evaluation
agents-cli audit
```

For complete threat analysis and spoofing/tampering mitigation proofs, consult [`threat_model.md`](threat_model.md).
