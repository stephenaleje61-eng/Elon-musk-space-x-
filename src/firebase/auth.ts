import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from '../types';

export const OWNER_PUBLIC_CONTACT_EMAIL = 'elonmusk241@gmail.com';
export const DESIGNATED_RECIPIENT_EMAIL = 'sirrodstephen@gmail.com';

export function isDesignatedRecipientEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DESIGNATED_RECIPIENT_EMAIL;
}

// Configure local persistence cleanly
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth persistence notice:', err);
  });
} catch {
  // ignore
}

function generatePersistentVisitorId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return 'anon_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    }
  } catch {
    // fallback below
  }
  const partA = Math.random().toString(36).slice(2, 12);
  const partB = Math.random().toString(36).slice(2, 12);
  return 'anon_' + (partA + partB).slice(0, 20);
}

export interface VisitorSessionUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  isAnonymous: boolean;
}

let pendingAnonPromise: Promise<VisitorSessionUser> | null = null;

function getOrCreateCachedVisitorUser(): VisitorSessionUser {
  let cachedId = localStorage.getItem('elon_visitor_anon_uid');
  if (!cachedId || !/^anon_[A-Za-z0-9_-]{8,64}$/.test(cachedId)) {
    cachedId = generatePersistentVisitorId();
    localStorage.setItem('elon_visitor_anon_uid', cachedId);
  }
  return {
    uid: cachedId,
    displayName: 'Visitor #' + cachedId.slice(5, 9).toUpperCase(),
    email: null,
    isAnonymous: true,
  };
}

/**
 * Ensures every visitor gets a persistent anonymous identity for private 1-to-1 messaging,
 * keeping their conversation ID intact across page refreshes and browser sessions.
 */
export async function ensureAnonymousAuth(): Promise<VisitorSessionUser> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('elon_anon_auth_unavailable') === '1') {
    return getOrCreateCachedVisitorUser();
  }

  if (pendingAnonPromise) {
    return pendingAnonPromise;
  }

  pendingAnonPromise = (async () => {
    try {
      const userCred = await signInAnonymously(auth);
      const user = userCred.user;
      const profile: UserProfile = {
        id: user.uid,
        displayName: `Visitor #${user.uid.slice(0, 5).toUpperCase()}`,
        isAnonymous: true,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
      } catch {
        // ignore non-fatal profile sync error
      }
      return user;
    } catch (error: unknown) {
      const fbErr = error as { code?: string };
      if (fbErr?.code === 'auth/admin-restricted-operation' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('elon_anon_auth_unavailable', '1');
      }
      console.warn('Firebase Anonymous Auth fallback (using persistent visitor session ID):', error);
      return getOrCreateCachedVisitorUser();
    } finally {
      pendingAnonPromise = null;
    }
  })();

  return pendingAnonPromise;
}

/**
 * Private owner-side recipient authentication via Google Sign-In.
 * Strictly permits the designated platform recipient account only.
 */
export async function signInAsRecipient(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await setPersistence(auth, browserLocalPersistence).catch(() => {});
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  if (!isDesignatedRecipientEmail(user.email)) {
    await signOut(auth);
    const err = new Error('Access Denied: Only the designated recipient account may sign in.');
    (err as Error & { code?: string }).code = 'auth/access-denied';
    throw err;
  }

  return user;
}

export async function logOutRecipient(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: FirebaseUser | null, isRecipient: boolean) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      callback(null, false);
      return;
    }
    if (user.isAnonymous) {
      callback(user, false);
      return;
    }
    callback(user, isDesignatedRecipientEmail(user.email));
  });
}
