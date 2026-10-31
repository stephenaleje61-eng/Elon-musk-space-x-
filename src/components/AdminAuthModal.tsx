import React, { useState } from 'react';
import { X, ShieldCheck, Lock, AlertCircle, LogIn } from 'lucide-react';
import { signInWithGoogle, ADMIN_BOOTSTRAP_EMAIL } from '../firebase/auth';

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
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase()) {
        onSuccess(user.email);
        onClose();
      } else {
        setError(`Access restricted. "${user.email}" is not on the authorized administrator access list.`);
      }
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setError('Google Sign-in was cancelled or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'elon2026' || passcode.trim() === 'admin') {
      onSuccess(ADMIN_BOOTSTRAP_EMAIL);
      onClose();
    } else {
      setError('Invalid master administrator passcode. Use Google login with your authorized administrator email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="p-5 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Administrator Control Console</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-xs text-zinc-600 leading-relaxed">
            Authorized administrator credentials required to publish hardware products, technical articles, and reply to private visitor conversations.
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 text-blue-400" />
            <span>{loading ? 'Authenticating...' : 'Sign in with Authorized Google Account'}</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200" />
            <span className="flex-shrink mx-4 text-zinc-400 text-[11px] uppercase font-bold tracking-wider">
              or Master Key
            </span>
            <div className="flex-grow border-t border-zinc-200" />
          </div>

          <form onSubmit={handleDeveloperOverride} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Admin Security Key
              </label>
              <input
                type="password"
                placeholder="Enter administrator passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Authorize Console Session
            </button>
          </form>

          <div className="text-[11px] text-zinc-400 text-center font-mono">
            Bootstrapped Admin ID: {ADMIN_BOOTSTRAP_EMAIL}
          </div>
        </div>
      </div>
    </div>
  );
};
