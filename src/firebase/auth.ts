import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from '../types';

export const ADMIN_BOOTSTRAP_EMAIL = 'sirrodstephen@gmail.com';

// Check if a user is an authorized administrator
export async function checkIsAdmin(user: FirebaseUser | null): Promise<boolean> {
  if (!user) return false;
  if (user.email && user.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      return true;
    }
  } catch {
    // silently fail
  }
  // Check user profile
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
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const isAdminUser = user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();

    const profile: UserProfile = {
      id: user.uid,
      email: user.email || undefined,
      displayName: user.displayName || 'Authorized User',
      photoURL: user.photoURL || undefined,
      isAnonymous: false,
      role: isAdminUser ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });

    if (isAdminUser) {
      await setDoc(doc(db, 'admins', user.uid), {
        id: user.uid,
        email: user.email,
        role: 'admin',
        addedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Sign out
export async function logOutUser(): Promise<void> {
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
