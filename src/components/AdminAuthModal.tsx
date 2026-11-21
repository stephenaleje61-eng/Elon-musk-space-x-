import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  LogIn,
  Lock,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import {
  signInWithGoogle,
  OWNER_FIREBASE_UID,
  isAuthorizedOwnerEmail,
  checkIsAdmin,
} from '../firebase/auth';
import { grantAdminByUid } from '../firebase/adminService';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  // Check if current session is already the authenticated administrator
  const currentFbUser = auth.currentUser;
  const isAlreadyAuthenticatedOwner =
    currentFbUser &&
    !currentFbUser.isAnonymous &&
    isAuthorizedOwnerEmail(currentFbUser.email);

  // Primary: Google Authentication (strictly restricted to authorized owner email)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const user = await signInWithGoogle();
      const isAuthorized = await checkIsAdmin(user);

      if (isAuthorized && isAuthorizedOwnerEmail(user.email)) {
        await grantAdminByUid(user.uid, user.email || '');
        onSuccess(user.email || '');
        onClose();
      } else {
        await signOut(auth);
        setError(
          `Access Denied: "${user.email || user.uid}" is not authorized to access the Administrator Control Console.`
        );
      }
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === 'auth/access-denied') {
        setError('Access Denied: Only the authorized administrator Google account may access this dashboard.');
      } else if (firebaseError?.code === 'auth/popup-blocked') {
        setError(
          'Browser Popup Blocked: Your browser blocked the Google sign-in window. Please enable popups for this site or open in a new tab.'
        );
      } else if (firebaseError?.code === 'auth/popup-closed-by-user') {
        setError('Sign-In Cancelled: The authentication window was closed before completing verification.');
      } else if (firebaseError?.code === 'auth/network-request-failed') {
        setError('Network Error: Could not connect to Firebase Authentication backend. Please verify your connection.');
      } else if (firebaseError?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setError(
          `Domain Configuration Error: "${host}" is not in Firebase Console > Authentication > Settings > Authorized domains. Add this domain in Firebase Console and try again.`
        );
      } else {
        setError(
          firebaseError?.message ||
            'Access Denied: Authentication verification failed. Please sign in with the authorized administrator account.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Secondary: Firebase Account UID Verification (requires active authorized Google session)
  const handleUidOrKeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = passcode.trim();
    if (!input) {
      setError('Please provide your Firebase Account UID.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const matchesOwnerUid = input === OWNER_FIREBASE_UID;
      const matchesOwnerEmail = isAuthorizedOwnerEmail(input);

      if (matchesOwnerUid || matchesOwnerEmail) {
        if (currentFbUser && !currentFbUser.isAnonymous && isAuthorizedOwnerEmail(currentFbUser.email)) {
          await grantAdminByUid(currentFbUser.uid, currentFbUser.email || '');
          onSuccess(currentFbUser.email || '');
          onClose();
          return;
        }

        if (currentFbUser && !currentFbUser.isAnonymous) {
          await signOut(auth);
          setError('Access Denied: Active Google account is not the authorized administrator.');
          return;
        }

        setNotice(
          'Please click "Sign in with Authorized Google Account" above to verify your administrator Google account.'
        );
      } else {
        setError('Access Denied: The provided credential is not recognized as the authorized administrator.');
      }
    } catch (err: unknown) {
      console.error('UID verification notice:', err);
      setError('Access Denied: Authentication verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Administrator Control Console</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Website Owner Authorization Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status info - strictly no personal admin email exposed to visitors */}
          <div className="text-xs text-zinc-600 leading-relaxed">
            Restricted access. Only the explicitly authorized website owner Google account can unlock the Administrator Control Console.
          </div>

          {/* Active Session Notice if already authenticated as owner */}
          {isAlreadyAuthenticatedOwner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-950">Active Owner Session Detected</div>
                <div className="text-emerald-800 font-mono text-[11px] mt-0.5">
                  Signed in as: {currentFbUser.email || currentFbUser.uid}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSuccess(currentFbUser.email || '');
                    onClose();
                  }}
                  className="mt-2.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Enter Administrator Dashboard →
                </button>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Authentication Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Notice Display */}
          {notice && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Verification Notice</strong>
                <span>{notice}</span>
              </div>
            </div>
          )}

          {/* Primary Action: Google Account Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-900 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>
              {loading
                ? 'Authenticating with Google...'
                : 'Sign in with Authorized Google Account'}
            </span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200" />
            <span className="flex-shrink mx-4 text-zinc-400 text-[10px] uppercase font-bold tracking-wider font-mono">
              or Verify Firebase UID
            </span>
            <div className="flex-grow border-t border-zinc-200" />
          </div>

          {/* Secondary Action: Firebase UID Verification */}
          <form onSubmit={handleUidOrKeyAuth} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-mono">
                  Owner Firebase UID
                </label>
              </div>
              <input
                type="password"
                placeholder="Enter Firebase Account UID..."
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                  if (notice) setNotice(null);
                }}
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              {loading ? 'Verifying Authorization...' : 'Verify Administrator Credentials'}
            </button>
          </form>

          {/* Security & Cryptographic Guarantee Notice */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 space-y-1">
            <div className="text-zinc-800 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Server-Side Firestore Security Enforced</span>
            </div>
            <div className="text-[10px] text-zinc-500 leading-normal">
              Protected by Cloud Firestore Security Rules. Only the authenticated website owner is granted administrator permissions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
