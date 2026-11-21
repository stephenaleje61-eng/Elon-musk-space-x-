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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from '../types';

export const OWNER_PUBLIC_CONTACT_EMAIL = 'elonmusk241@gmail.com';
export const OWNER_GOOGLE_EMAIL = 'elonmusk241@gmail.com';
export const OWNER_AUTHORIZED_EMAILS = [
  'elonmusk241@gmail.com',
  'sirrodstephen@gmail.com',
];
export const OWNER_FIREBASE_UID = '4W2iB38N41cR0hXfN1tP4f4M5uE2';
export const ADMIN_BOOTSTRAP_EMAIL = OWNER_PUBLIC_CONTACT_EMAIL;

export function isAuthorizedOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OWNER_AUTHORIZED_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

// Ensure persistence is configured
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth persistence initialization notice:', err);
  });
} catch {
  // ignore
}

// Check if a user is the explicitly authorized website owner
export async function checkIsAdmin(user: FirebaseUser | null): Promise<boolean> {
  if (!user) return false;

  // 1. Direct match on authorized owner Google emails
  if (isAuthorizedOwnerEmail(user.email)) {
    return true;
  }

  // 2. Direct match on authenticated Firebase UID
  if (user.uid === OWNER_FIREBASE_UID) {
    return true;
  }

  // 3. Document in /admins/{uid}
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      return true;
    }
  } catch {
    // silently fail
  }

  // 4. Check user profile in /users/{uid}
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && userDoc.data().role === 'admin') {
      return true;
    }
  } catch {
    // fallback
  }

  return false;
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

let pendingAnonPromise: Promise<{
  uid: string;
  displayName?: string | null;
  email?: string | null;
  isAnonymous: boolean;
}> | null = null;

function getOrCreateCachedVisitorUser() {
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

// Ensure anonymous visitor authentication (with persistent high-entropy session fallback if project disables anon provider)
export async function ensureAnonymousAuth(): Promise<{
  uid: string;
  displayName?: string | null;
  email?: string | null;
  isAnonymous: boolean;
}> {
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
      console.warn('Firebase Anonymous Auth notice (using persistent device visitor ID):', error);
      return getOrCreateCachedVisitorUser();
    } finally {
      pendingAnonPromise = null;
    }
  })();

  return pendingAnonPromise;
}

// Sign in with Google (preferred for popup auth)
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // ignore
    }
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const isOwner =
      isAuthorizedOwnerEmail(user.email) ||
      user.uid === OWNER_FIREBASE_UID;

    const profile: UserProfile = {
      id: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || (isOwner ? 'Platform Administrator' : 'Authorized User'),
      photoURL: user.photoURL || undefined,
      isAnonymous: false,
      role: isOwner ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    } catch (e) {
      console.warn('Profile sync notice:', e);
    }

    if (isOwner) {
      try {
        await setDoc(
          doc(db, 'admins', user.uid),
          {
            id: user.uid,
            email: user.email || OWNER_PUBLIC_CONTACT_EMAIL,
            role: 'admin',
            addedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        localStorage.setItem('elon_admin_authorized_email', user.email || OWNER_PUBLIC_CONTACT_EMAIL);
      } catch (e) {
        console.warn('Admin record sync notice:', e);
      }
    }

    return user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Sign out
export async function logOutUser(): Promise<void> {
  localStorage.removeItem('elon_admin_authorized_email');
  await signOut(auth);
}

// Subscribe to auth state changes
export function subscribeToAuth(callback: (user: FirebaseUser | null, isAdmin: boolean) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const isAdmin = await checkIsAdmin(user);
      callback(user, isAdmin);
    } else {
      callback(null, false);
    }
  });
}
