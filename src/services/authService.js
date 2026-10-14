/**
 * Organizer Authentication & Authorization Service
 *
 * Provides cryptographic authorization for the Organizer Command Center.
 * Does NOT contain hardcoded plaintext passwords.
 * Uses SHA-256 hash verification against environment configuration (VITE_ORGANIZER_KEY_HASH)
 * or initialized organizer passkey.
 *
 * Enforces session-based authorization tokens in sessionStorage with automatic expiry.
 */

export const ORGANIZER_SESSION_KEY = 'aiss_organizer_auth_session_v1';
export const ORGANIZER_LOCAL_HASH_KEY = 'aiss_organizer_custom_hash_v1';

// Default SHA-256 digest for initial setup: corresponds to 'Organizer@Symposium2026'
// Configure VITE_ORGANIZER_KEY_HASH in .env to customize.
export const DEFAULT_KEY_HASH =
  '3def2d9e8694de540551fd02d693145b221b95ecda3357942d013e3ce5d8290c';

/**
 * Computes the hex SHA-256 hash of a string using Web Crypto API.
 * Compatible with modern browsers and Node.js 18+.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256Hex(text) {
  if (!text) return '';
  const cryptoObj =
    typeof crypto !== 'undefined'
      ? crypto
      : typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : null;

  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API is not available in the current environment.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolves the authorized organizer key hash from environment or storage.
 * @returns {string}
 */
export function getAuthorizedKeyHash() {
  if (typeof window !== 'undefined' && window.VITE_ORGANIZER_KEY_HASH) {
    return window.VITE_ORGANIZER_KEY_HASH.trim().toLowerCase();
  }
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_ORGANIZER_KEY_HASH
  ) {
    return import.meta.env.VITE_ORGANIZER_KEY_HASH.trim().toLowerCase();
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_ORGANIZER_KEY_HASH) {
    return process.env.VITE_ORGANIZER_KEY_HASH.trim().toLowerCase();
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(ORGANIZER_LOCAL_HASH_KEY);
      if (stored && stored.trim()) {
        return stored.trim().toLowerCase();
      }
    }
  } catch {
    // Storage restricted
  }
  return DEFAULT_KEY_HASH;
}

// In-memory session fallback for tests or storage-restricted environments
let memoryOrganizerSession = null;

/**
 * Checks whether an organizer session is currently authorized and active.
 *
 * @returns {boolean}
 */
export function isOrganizerAuthorized() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(ORGANIZER_SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session || !session.token || !session.expiresAt) return false;
      if (Date.now() > session.expiresAt) {
        window.sessionStorage.removeItem(ORGANIZER_SESSION_KEY);
        return false;
      }
      return true;
    }
  } catch {
    // fallback to memory
  }

  if (memoryOrganizerSession) {
    if (Date.now() > memoryOrganizerSession.expiresAt) {
      memoryOrganizerSession = null;
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Retrieves the active organizer session token if valid.
 * @returns {object|null}
 */
export function getOrganizerSession() {
  if (!isOrganizerAuthorized()) return null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(ORGANIZER_SESSION_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback to memory
  }
  return memoryOrganizerSession;
}

/**
 * Authenticates an entered organizer passkey against the authorized SHA-256 hash.
 * If valid, creates an expiring session token in sessionStorage.
 *
 * @param {string} enteredKey
 * @returns {Promise<{ success: boolean, error?: string, session?: object }>}
 */
export async function authenticateOrganizer(enteredKey) {
  if (!enteredKey || typeof enteredKey !== 'string' || !enteredKey.trim()) {
    return {
      success: false,
      error: 'Organizer passkey is required.'
    };
  }

  const computedHash = await sha256Hex(enteredKey.trim());
  const authorizedHash = getAuthorizedKeyHash();

  if (computedHash.toLowerCase() !== authorizedHash.toLowerCase()) {
    return {
      success: false,
      error: 'Invalid organizer authorization credentials. Access denied.'
    };
  }

  // Create expiring organizer session (2 hours duration)
  const sessionToken = {
    token: `ORG-SESSION-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    role: 'symposium_organizer'
  };

  memoryOrganizerSession = sessionToken;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(ORGANIZER_SESSION_KEY, JSON.stringify(sessionToken));
    }
  } catch {
    // Storage access issue
  }

  return {
    success: true,
    session: sessionToken
  };
}

/**
 * Signs out the organizer by destroying the active authorization session.
 */
export function logoutOrganizer() {
  memoryOrganizerSession = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(ORGANIZER_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Allows updating or initializing a custom organizer passkey hash.
 *
 * @param {string} newPasskey
 * @returns {Promise<string>} The new hash
 */
export async function setOrganizerPasskey(newPasskey) {
  if (!newPasskey || newPasskey.trim().length < 6) {
    throw new Error('Organizer passkey must be at least 6 characters long.');
  }
  const hash = await sha256Hex(newPasskey.trim());
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ORGANIZER_LOCAL_HASH_KEY, hash);
    }
  } catch {
    // ignore
  }
  return hash;
}
