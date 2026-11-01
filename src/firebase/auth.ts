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

export const OWNER_GOOGLE_EMAIL = 'sirrodstephen@gmail.com';
export const OWNER_FIREBASE_UID = '4W2iB38N41cR0hXfN1tP4f4M5uE2';
export const ADMIN_BOOTSTRAP_EMAIL = OWNER_GOOGLE_EMAIL;

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

  // 1. Direct match on authenticated Google Email
  if (user.email && user.email.toLowerCase() === OWNER_GOOGLE_EMAIL.toLowerCase()) {
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

// Ensure anonymous visitor authentication when interacting with private features
export async function ensureAnonymousAuth(): Promise<{
  uid: string;
  displayName?: string | null;
  email?: string | null;
  isAnonymous: boolean;
}> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const userCred = await signInAnonymously(auth);
    // Record user profile in firestore
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
      // ignore
    }
    return user;
  } catch (error) {
    console.warn('Anonymous auth notice (using session fallback):', error);
    let cachedId = localStorage.getItem('elon_visitor_anon_uid');
    if (!cachedId) {
      cachedId = 'anon_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('elon_visitor_anon_uid', cachedId);
    }
    return {
      uid: cachedId,
      displayName: 'Visitor #' + cachedId.slice(5, 9).toUpperCase(),
      email: null,
      isAnonymous: true,
    };
  }
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
      (user.email && user.email.toLowerCase() === OWNER_GOOGLE_EMAIL.toLowerCase()) ||
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
        await setDoc(doc(db, 'admins', user.uid), {
          id: user.uid,
          email: user.email || OWNER_GOOGLE_EMAIL,
          role: 'admin',
          addedAt: new Date().toISOString(),
        }, { merge: true });
        localStorage.setItem('elon_admin_authorized_email', user.email || OWNER_GOOGLE_EMAIL);
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
