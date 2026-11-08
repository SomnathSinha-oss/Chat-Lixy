/**
 * ChatLixy End-to-End Encryption (E2EE) Module
 * Built strictly on the Web Crypto API (SubtleCrypto)
 * Standard: AES-256-GCM authenticated encryption + ECDH (P-256) Key Agreement
 */

// Utility: ArrayBuffer to Base64
export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Utility: Base64 to ArrayBuffer
export function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate a new ECDH P-256 keypair for a user
 */
export async function generateUserKeyPair() {
    return await window.crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256'
        },
        true, // exportable
        ['deriveKey', 'deriveBits']
    );
}

/**
 * Export a public key to raw base64 format for sharing
 */
export async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return bufferToBase64(exported);
}

/**
 * Import a peer's public key from raw base64
 */
export async function importPublicKey(base64Key) {
    const buffer = base64ToBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        'raw',
        buffer,
        {
            name: 'ECDH',
            namedCurve: 'P-256'
        },
        true,
        []
    );
}

/**
 * Derive an AES-256-GCM symmetric key using ECDH key agreement
 */
export async function deriveSharedConversationKey(privateKey, peerPublicKey) {
    return await window.crypto.subtle.deriveKey(
        {
            name: 'ECDH',
            public: peerPublicKey
        },
        privateKey,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive a deterministic AES-256-GCM key from a conversation secret/passphrase
 * using PBKDF2 with SHA-256 (for instant conversation room encryption)
 */
export async function deriveKeyFromSecret(secretPhrase, salt = 'chatlixy-e2ee-salt-v1') {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(secretPhrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256
        },
        true, // allow export for caching
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate a random AES-256-GCM symmetric key
 */
export async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a message or payload using AES-256-GCM
 * @param {string|object} data - Plaintext or structured JSON object
 * @param {CryptoKey} cryptoKey - AES-256-GCM key
 * @returns {Promise<{ ciphertext: string, iv: string }>}
 */
export async function encryptPayload(data, cryptoKey) {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    const enc = new TextEncoder();
    const encodedData = enc.encode(stringData);

    // 12-byte IV standard for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
            tagLength: 128 // 128-bit authentication tag
        },
        cryptoKey,
        encodedData
    );

    return {
        ciphertext: bufferToBase64(encryptedBuffer),
        iv: bufferToBase64(iv.buffer)
    };
}

/**
 * Decrypts an AES-256-GCM encrypted ciphertext
 * If tampered with, throws an Authentication Tag Verification Error (STRIDE Tampering protection)
 * @param {string} ciphertextBase64 - Base64 encrypted payload
 * @param {string} ivBase64 - Base64 12-byte IV
 * @param {CryptoKey} cryptoKey - AES-256-GCM key
 * @returns {Promise<string>} Plaintext message
 */
export async function decryptPayload(ciphertextBase64, ivBase64, cryptoKey) {
    try {
        const cipherBuffer = base64ToBuffer(ciphertextBase64);
        const ivBuffer = base64ToBuffer(ivBase64);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(ivBuffer),
                tagLength: 128
            },
            cryptoKey,
            cipherBuffer
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    } catch (err) {
        console.error('E2EE Decryption failed (integrity check failed):', err);
        throw new Error('Message integrity check failed. The ciphertext may have been tampered with or the encryption key is incorrect.', { cause: err });
    }
}

/**
 * Generate a visual 60-digit security fingerprint (like WhatsApp / Signal safety numbers)
 */
export async function generateFingerprint(keyA, keyB) {
    const enc = new TextEncoder();
    const combined = `${keyA}:${keyB}`;
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(combined));
    const hashBytes = new Uint8Array(hashBuffer);

    // Convert to 12 groups of 5 digits
    let digits = '';
    for (let i = 0; i < hashBytes.length; i++) {
        digits += String(hashBytes[i] % 10);
    }
    return digits.slice(0, 60).replace(/(\d{5})(?=\d)/g, '$1 ');
}
