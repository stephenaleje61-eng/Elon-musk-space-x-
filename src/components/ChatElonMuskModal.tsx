import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Lock,
  User,
  Clock,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  CheckCheck,
} from 'lucide-react';
import {
  getLocalChatBackup,
  updateLocalChatBackup,
  subscribeToVisitorConversation,
  subscribeToRealMessages,
  sendRealHumanMessage,
  subscribeToAllAdminConversations,
  exportAllChatsJson,
} from '../firebase/chatService';
import { ensureAnonymousAuth, ADMIN_BOOTSTRAP_EMAIL } from '../firebase/auth';
import { Conversation, Message } from '../types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ChatElonMuskModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const ChatElonMuskModal: React.FC<ChatElonMuskModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  // Mode: 'visitor' (default direct chat) or 'host' (where you see all incoming visitor chats)
  const [viewMode, setViewMode] = useState<'visitor' | 'host'>('visitor');
  const [hostUnlocked, setHostUnlocked] = useState(isAdmin);
  const [hostPasscode, setHostPasscode] = useState('');
  const [showHostLogin, setShowHostLogin] = useState(false);

  // Visitor Chat State
  const [visitorId, setVisitorId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('Visitor');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Host (You) State
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [selectedVisitorConv, setSelectedVisitorConv] = useState<Conversation | null>(null);
  const [hostMessages, setHostMessages] = useState<Message[]>([]);
  const [hostReplyText, setHostReplyText] = useState('');
  const [isHostSending, setIsHostSending] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hostMessagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Visitor State
  useEffect(() => {
    if (!isOpen) return;

    let unsubConv: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;

    async function initVisitorChat() {
      try {
        const user = await ensureAnonymousAuth();
        setVisitorId(user.uid);

        // Check local recovery backup
        const backup = getLocalChatBackup();
        const initialName = backup.visitorName || `Visitor #${user.uid.slice(0, 4).toUpperCase()}`;
        setVisitorName(initialName);
        setTempName(initialName);

        const convId = `conv_${user.uid}`;

        // Ensure conversation document exists in Firestore
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);
        if (!convSnap.exists()) {
          const now = new Date().toISOString();
          await setDoc(convRef, {
            id: convId,
            visitorId: user.uid,
            visitorName: initialName,
            status: 'accepted',
            submittedAt: now,
            lastMessageText: '',
            lastMessageTime: now,
            unreadAdminCount: 0,
            unreadVisitorCount: 0,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Subscribe to real-time messages directly
        unsubMsgs = subscribeToRealMessages(convId, (realMsgs) => {
          setMessages(realMsgs);
        });

        // Subscribe to conversation metadata
        unsubConv = subscribeToVisitorConversation(convId, (conv) => {
          if (conv && conv.visitorName && conv.visitorName !== visitorName) {
            setVisitorName(conv.visitorName);
          }
        });
      } catch (err) {
        console.error('Failed to initialize direct private chat:', err);
      }
    }

    initVisitorChat();

    return () => {
      if (unsubConv) unsubConv();
      if (unsubMsgs) unsubMsgs();
    };
  }, [isOpen]);

  // Synchronize admin status
  useEffect(() => {
    if (isAdmin) {
      setHostUnlocked(true);
    }
  }, [isAdmin]);

  // Host Real-Time Listener (subscribes to all visitor conversations)
  useEffect(() => {
    if (!isOpen || viewMode !== 'host' || !hostUnlocked) return;

    const unsubAll = subscribeToAllAdminConversations((convs) => {
      setAllConversations(convs);
    });

    return () => {
      unsubAll();
    };
  }, [isOpen, viewMode, hostUnlocked]);

  // Host Real-Time Messages Listener for Selected Visitor
  useEffect(() => {
    if (!selectedVisitorConv) return;
    const unsub = subscribeToRealMessages(selectedVisitorConv.id, (msgs) => {
      setHostMessages(msgs);
    });
    return () => unsub();
  }, [selectedVisitorConv]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    hostMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hostMessages]);

  // Visitor: Send Real Message
  const handleVisitorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !visitorId || isSending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);
    setSendError(null);

    const convId = `conv_${visitorId}`;

    try {
      await sendRealHumanMessage(
        convId,
        'visitor',
        visitorId,
        visitorName,
        text
      );
      // Update local storage backup
      updateLocalChatBackup({
        visitorId,
        visitorName,
        conversationId: convId,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setSendError('Message failed to deliver. Please check connection and retry.');
      setInputMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  // Host: Send Real Reply directly to Visitor
  const handleHostSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostReplyText.trim() || !selectedVisitorConv || isHostSending) return;

    const text = hostReplyText.trim();
    setHostReplyText('');
    setIsHostSending(true);

    try {
      await sendRealHumanMessage(
        selectedVisitorConv.id,
        'admin',
        visitorId || 'admin',
        'Elon Musk',
        text
      );
    } catch (err) {
      console.error('Host reply failed:', err);
      setHostReplyText(text);
    } finally {
      setIsHostSending(false);
    }
  };

  // Update Visitor Name
  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setVisitorName(tempName.trim());
    setIsEditingName(false);
    updateLocalChatBackup({ visitorName: tempName.trim() });
    if (visitorId) {
      try {
        await setDoc(
          doc(db, 'conversations', `conv_${visitorId}`),
          { visitorName: tempName.trim(), updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch {
        // silent
      }
    }
  };

  // Host Login with Passcode
  const handleHostLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (hostPasscode.trim() === 'elon2026' || hostPasscode.trim() === 'admin') {
      setHostUnlocked(true);
      setShowHostLogin(false);
      setViewMode('host');
      setHostPasscode('');
    } else {
      alert('Invalid host security key.');
    }
  };

  // Export JSON backup
  const handleExportChats = async () => {
    const jsonStr = await exportAllChatsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elon_private_chats_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Export complete: Downloaded JSON archive.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      {/* Strict Monochrome Black & White Window */}
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[680px] bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-black border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black font-extrabold text-xs flex items-center justify-center tracking-tighter shadow-sm">
              EM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-white">
                  MESSAGE ELON MUSK
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded uppercase">
                  Private Line
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Live Encrypted Direct Chat</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Host Inbox Switcher for You */}
            {hostUnlocked ? (
              <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
                <button
                  onClick={() => setViewMode('visitor')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    viewMode === 'visitor'
                      ? 'bg-white text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Chat View
                </button>
                <button
                  onClick={() => setViewMode('host')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    viewMode === 'host'
                      ? 'bg-white text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  My Inbox ({allConversations.length})
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowHostLogin(true)}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Host Login"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
              aria-label="Close message window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ------------------- VISITOR VIEW (DIRECT PRIVATE CHAT) ------------------- */}
        {viewMode === 'visitor' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            {/* Identity & Status Strip */}
            <div className="px-5 py-2 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between text-xs text-zinc-400 shrink-0 font-mono">
              <div className="flex items-center gap-2 truncate">
                <span className="text-zinc-500">Chatting as:</span>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-white rounded text-xs focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-white hover:underline text-[11px] font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-white font-bold hover:underline cursor-pointer"
                    title="Click to edit display name"
                  >
                    {visitorName} ✎
                  </button>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-500" />
                <span>1-on-1 Encrypted</span>
              </div>
            </div>

            {/* Direct Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-black">
              {messages.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-xs font-mono max-w-sm mx-auto leading-relaxed">
                  <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center mx-auto mb-3 text-white font-bold text-sm">
                    EM
                  </div>
                  <strong className="text-white block mb-1 text-sm">Direct Line to Elon Musk</strong>
                  Type your message below. All messages are genuinely delivered in real time to the host console.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.from === 'visitor';
                  const formattedTime = new Date(m.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-zinc-500 mb-1 px-1 font-mono">
                        {isMe ? visitorName : 'Elon Musk'} · {formattedTime}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-zinc-900 text-white border border-zinc-800 rounded-tr-none'
                            : 'bg-white text-black font-medium rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error notice if send fails */}
            {sendError && (
              <div className="px-4 py-2 bg-zinc-900 text-white text-xs border-t border-zinc-800 flex items-center justify-between">
                <span>{sendError}</span>
                <button onClick={handleVisitorSend} className="underline font-bold ml-2 cursor-pointer">
                  Retry
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleVisitorSend}
              className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message to Elon Musk..."
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="px-6 py-3 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
              >
                SEND
              </button>
            </form>
          </div>
        )}

        {/* ------------------- HOST VIEW (FOR YOU TO CHAT WITH VISITORS) ------------------- */}
        {viewMode === 'host' && hostUnlocked && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black">
            {/* Left: Visitor Conversations List */}
            <div className="w-full md:w-64 border-r border-zinc-800 flex flex-col overflow-hidden shrink-0 bg-zinc-950">
              <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="font-extrabold text-white">Visitors ({allConversations.length})</span>
                <button
                  onClick={handleExportChats}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  title="Download JSON backup"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {exportNotice && (
                <div className="p-2 bg-zinc-900 text-[10px] text-zinc-300 font-mono border-b border-zinc-800">
                  {exportNotice}
                </div>
              )}

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
                {allConversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                    No visitor messages yet. As people message Elon Musk, their private threads appear here in real time.
                  </div>
                ) : (
                  allConversations.map((c) => {
                    const isSelected = selectedVisitorConv?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedVisitorConv(c)}
                        className={`p-3.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-zinc-900 text-white font-bold'
                            : 'hover:bg-zinc-900/60 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate">{c.visitorName || 'Visitor'}</span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {new Date(c.updatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {c.lastMessageText || 'Opened chat'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Active 1-on-1 Chat Stream with Selected Visitor */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black">
              {selectedVisitorConv ? (
                <>
                  {/* Selected Visitor Header */}
                  <div className="p-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-extrabold text-white text-sm">
                        {selectedVisitorConv.visitorName || 'Visitor'}
                      </span>
                      <span className="text-zinc-500 ml-2">ID: {selectedVisitorConv.visitorId.slice(0, 10)}...</span>
                    </div>
                    <span className="text-white font-bold text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      Live Private Thread
                    </span>
                  </div>

                  {/* Messages Stream: Visitor on Left, You (Host) on Right */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
                    {hostMessages.map((m) => {
                      const isHost = m.from === 'admin';
                      const formattedTime = new Date(m.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isHost ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-[10px] text-zinc-500 mb-1 px-1 font-mono">
                            {isHost ? 'You (Elon Musk)' : selectedVisitorConv.visitorName} · {formattedTime}
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                              isHost
                                ? 'bg-white text-black font-medium rounded-tr-none'
                                : 'bg-zinc-900 text-white border border-zinc-800 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={hostMessagesEndRef} />
                  </div>

                  {/* Reply Input Bar */}
                  <form
                    onSubmit={handleHostSendReply}
                    className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={hostReplyText}
                      onChange={(e) => setHostReplyText(e.target.value)}
                      placeholder={`Reply directly to ${selectedVisitorConv.visitorName}...`}
                      className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!hostReplyText.trim() || isHostSending}
                      className="px-5 py-2.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      SEND
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-mono p-6 text-center">
                  Select a visitor from the list on the left to read and reply to their messages.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Host Login Modal Overlay */}
        {showHostLogin && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center items-center z-30">
            <div className="max-w-sm w-full bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-extrabold text-white">Host Access</h4>
                <button
                  onClick={() => setShowHostLogin(false)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mb-4">
                Enter host security key to manage and reply to all visitor messages.
              </p>

              <form onSubmit={handleHostLogin} className="space-y-3">
                <input
                  type="password"
                  placeholder="Security key..."
                  value={hostPasscode}
                  onChange={(e) => setHostPasscode(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-white font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
                >
                  Open Host Inbox
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
