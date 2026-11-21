import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Paperclip,
  ArrowLeft,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  RotateCcw,
  LogOut,
  Lock,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  subscribeToRecipientConversations,
  subscribeToRealMessages,
  sendDirectPrivateMessage,
  createMessageId,
  markMessagesAsRead,
} from '../firebase/chatService';
import {
  signInAsRecipient,
  logOutRecipient,
  isDesignatedRecipientEmail,
} from '../firebase/auth';
import { uploadImage, compressImageFile } from '../firebase/storage';
import { Conversation, Message } from '../types';

interface RecipientInboxViewProps {
  user: { uid: string; email?: string | null } | null;
  isRecipient: boolean;
  onBackToSite: () => void;
}

export const RecipientInboxView: React.FC<RecipientInboxViewProps> = ({
  user,
  isRecipient,
  onBackToSite,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const [localOutbound, setLocalOutbound] = useState<Record<string, Message>>({});
  const [replyText, setReplyText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const verifiedRecipient = Boolean(isRecipient && isDesignatedRecipientEmail(user?.email));

  const messages = useMemo(() => {
    const confirmedIds = new Set(firestoreMessages.map((m) => m.id));
    const pendingOrFailed = Object.values(localOutbound).filter((m) => !confirmedIds.has(m.id));
    return [...firestoreMessages, ...pendingOrFailed].sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
  }, [firestoreMessages, localOutbound]);

  useEffect(() => {
    if (!verifiedRecipient) return;
    const unsub = subscribeToRecipientConversations(
      (list) => {
        setConversations(list);
        if (selectedConv) {
          const refreshed = list.find((c) => c.id === selectedConv.id);
          if (refreshed) setSelectedConv(refreshed);
        }
      },
      (err) => {
        setSendError(`Unable to load inbox threads: ${err.message}`);
      }
    );
    return () => unsub();
  }, [verifiedRecipient]);

  useEffect(() => {
    if (!verifiedRecipient || !selectedConv) return;
    markMessagesAsRead(selectedConv.id, 'recipient');
    const unsub = subscribeToRealMessages(
      selectedConv.id,
      (msgs) => {
        setFirestoreMessages(msgs);
        setLocalOutbound((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const m of msgs) {
            if (next[m.id]) {
              delete next[m.id];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      (err) => {
        setSendError(`Unable to stream messages: ${err.message}`);
      }
    );
    return () => unsub();
  }, [verifiedRecipient, selectedConv?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingPreview]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInAsRecipient();
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (fbErr?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(
          `Domain Configuration Error: "${host}" must be added in Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setAuthError(fbErr?.message || 'Access Denied.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const preview = await compressImageFile(file, 1080, 0.8);
      setPendingFile(file);
      setPendingPreview(preview);
    } catch {
      setSendError('Could not prepare picture.');
    }
  };

  const transmitReply = async (messageId: string, convId: string, text: string, imgUrl?: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const pendingMsg: Message = {
      id: messageId,
      conversationId: convId,
      from: 'recipient',
      senderId: user.uid,
      senderName: 'Communication Team',
      text,
      messageType: imgUrl ? 'image' : 'text',
      time: now,
      real: true,
      createdAt: now,
      deliveryStatus: 'sending',
      ...(imgUrl ? { imageUrl: imgUrl } : {}),
    };

    setLocalOutbound((prev) => ({ ...prev, [messageId]: pendingMsg }));
    setSending(true);
    setSendError(null);

    try {
      await sendDirectPrivateMessage({
        conversationId: convId,
        from: 'recipient',
        senderId: user.uid,
        senderName: 'Communication Team',
        text,
        imageUrl: imgUrl,
        existingMessageId: messageId,
      });
      setLocalOutbound((prev) => {
        if (!prev[messageId]) return prev;
        return {
          ...prev,
          [messageId]: { ...prev[messageId], deliveryStatus: 'sent' },
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendError(msg);
      setLocalOutbound((prev) => ({
        ...prev,
        [messageId]: { ...pendingMsg, deliveryStatus: 'failed', errorReason: msg },
      }));
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || sending) return;
    const trimmed = replyText.trim();
    if (!trimmed && !pendingPreview) return;

    const msgId = createMessageId();
    const file = pendingFile;
    const fallbackUrl = pendingPreview || undefined;

    setReplyText('');
    setPendingFile(null);
    setPendingPreview(null);

    let finalImgUrl = fallbackUrl;
    if (file) {
      setSending(true);
      finalImgUrl = await uploadImage(file, `chat_media/${selectedConv.id}`);
    }

    await transmitReply(msgId, selectedConv.id, trimmed, finalImgUrl);
  };

  if (!verifiedRecipient) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#070C17] border border-cyan-500/30 rounded-2xl p-6 space-y-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Private Recipient Reply Channel</h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              This private inbox is restricted strictly to the designated website recipient to respond to direct visitor inquiries.
            </p>
          </div>
          {authError && (
            <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl text-xs text-rose-200 text-left">
              {authError}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-50"
            >
              {authLoading ? 'Verifying...' : 'Sign In with Google as Recipient'}
            </button>
            <button
              type="button"
              onClick={onBackToSite}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Return to Elon Musk Space
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-64px)] bg-black text-white flex flex-col">
      {/* Top Recipient Inbox Bar */}
      <div className="px-4 sm:px-6 py-3 bg-[#05080F] border-b border-cyan-500/25 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToSite}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white">
              Recipient Direct Inbox ({conversations.length})
            </h1>
            <div className="text-[11px] font-mono text-cyan-400">{user?.email}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await logOutRecipient();
            onBackToSite();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Conversation List */}
        <div
          className={`w-full md:w-80 border-r border-zinc-800 bg-[#05080F] flex flex-col overflow-hidden shrink-0 ${
            selectedConv ? 'hidden md:flex' : 'flex-1 md:flex-initial'
          }`}
        >
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                No direct visitor threads yet.
              </div>
            ) : (
              conversations.map((c) => {
                const active = selectedConv?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConv(c)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      active ? 'bg-cyan-500/15 border-r-2 border-cyan-400' : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-sm text-white truncate">
                        {c.visitorName || 'Visitor'}
                      </span>
                      {(c.unreadAdminCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 bg-cyan-400 text-black text-[10px] font-extrabold rounded-full tabular-nums">
                          {c.unreadAdminCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {c.lastMessageText || 'Opened chat thread'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Conversation Reply Pane */}
        <div
          className={`flex-1 flex flex-col overflow-hidden bg-black ${
            selectedConv ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConv ? (
            <>
              <div className="px-4 py-3 bg-[#070C17] border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {selectedConv.visitorName || 'Visitor'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate">
                      {selectedConv.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
                {messages.map((m) => {
                  const isMine = m.from === 'recipient' || m.from === 'admin';
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                          isMine
                            ? 'bg-blue-600/25 border border-cyan-400/40 text-white'
                            : 'bg-[#0C111D] border border-zinc-800 text-zinc-100'
                        }`}
                      >
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="Attachment"
                            className="w-full max-h-64 object-cover rounded-xl mb-2"
                          />
                        )}
                        {m.audioUrl && (
                          <audio controls src={m.audioUrl} className="w-60 max-w-full mb-2" />
                        )}
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-mono text-zinc-400 tabular-nums">
                          <span>
                            {new Date(m.time || m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && m.deliveryStatus === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {isMine && m.deliveryStatus === 'sent' && <Check className="w-3 h-3" />}
                          {isMine && (!m.deliveryStatus || m.deliveryStatus === 'delivered') && (
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                          )}
                          {isMine && m.deliveryStatus === 'failed' && (
                            <button
                              type="button"
                              onClick={() => transmitReply(m.id, m.conversationId, m.text, m.imageUrl)}
                              className="inline-flex items-center gap-1 text-rose-400 underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {sendError && (
                <div className="px-4 py-2 bg-rose-950 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {pendingPreview && (
                <div className="px-4 py-2 bg-[#070C17] border-t border-zinc-800 flex items-center justify-between">
                  <img src={pendingPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFile(null);
                      setPendingPreview(null);
                    }}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendReply}
                className="p-3 bg-[#05080F] border-t border-zinc-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSelectImage}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-zinc-950 border border-zinc-800 hover:border-cyan-400/50 text-zinc-300 rounded-xl cursor-pointer"
                  aria-label="Attach image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${selectedConv.visitorName}...`}
                  className="flex-1 px-4 py-3 bg-black border border-zinc-800 focus:border-cyan-400 rounded-xl text-sm text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || (!replyText.trim() && !pendingPreview)}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>SEND</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <MessageSquare className="w-10 h-10 mb-3 text-cyan-500/40" />
              <div className="text-sm font-semibold text-zinc-300">Select a conversation</div>
              <p className="text-xs mt-1">Visitor messages stream here in real time from Firestore.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
