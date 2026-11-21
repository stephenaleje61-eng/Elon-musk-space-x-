import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Lock,
  Download,
  SlidersHorizontal,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Maximize2,
  Loader2,
  ShieldAlert,
  Ban,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  LogIn,
} from 'lucide-react';
import {
  getLocalChatBackup,
  updateLocalChatBackup,
  subscribeToVisitorConversation,
  subscribeToRealMessages,
  sendRealHumanMessage,
  subscribeToAllAdminConversations,
  exportAllChatsJson,
  toggleBlockConversation,
  createMessageId,
  markMessagesAsRead,
} from '../firebase/chatService';
import {
  ensureAnonymousAuth,
  signInWithGoogle,
  checkIsAdmin,
  isAuthorizedOwnerEmail,
  OWNER_FIREBASE_UID,
} from '../firebase/auth';
import { Conversation, Message } from '../types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { compressImageFile } from '../firebase/storage';

interface ChatElonMuskModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function formatErrorForUser(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('blocked')) {
    return 'You have been blocked by the administrator.';
  }
  if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
    return 'Permission denied by Firestore rules. Please retry or refresh.';
  }
  if (msg.includes('maximum size') || msg.includes('1048576')) {
    return 'Image exceeds size limit. Please select a smaller image.';
  }
  return 'Message failed to deliver. Please check connection and retry.';
}

export const ChatElonMuskModal: React.FC<ChatElonMuskModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  // Mode: 'visitor' (default direct chat) or 'host' (where website owner sees all incoming visitor chats)
  const [viewMode, setViewMode] = useState<'visitor' | 'host'>('visitor');
  const [hostUnlocked, setHostUnlocked] = useState(isAdmin);
  const [hostLoginError, setHostLoginError] = useState<string | null>(null);
  const [hostAuthLoading, setHostAuthLoading] = useState(false);
  const [showHostLogin, setShowHostLogin] = useState(false);

  // Visitor Chat State
  const [visitorId, setVisitorId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('Visitor');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const [localOutboundMessages, setLocalOutboundMessages] = useState<Record<string, Message>>({});
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isVisitorBlocked, setIsVisitorBlocked] = useState(false);

  // Visitor Image Attachment State
  const [visitorImage, setVisitorImage] = useState<string | null>(null);
  const [visitorImageName, setVisitorImageName] = useState<string | null>(null);
  const [isCompressingVisitorImage, setIsCompressingVisitorImage] = useState(false);
  const visitorFileInputRef = useRef<HTMLInputElement>(null);

  // Host (Owner) State
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [selectedVisitorConv, setSelectedVisitorConv] = useState<Conversation | null>(null);
  const [hostFirestoreMessages, setHostFirestoreMessages] = useState<Message[]>([]);
  const [hostLocalOutbound, setHostLocalOutbound] = useState<Record<string, Message>>({});
  const [hostReplyText, setHostReplyText] = useState('');
  const [isHostSending, setIsHostSending] = useState(false);
  const [hostSendError, setHostSendError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [hostBlockConfirmDialog, setHostBlockConfirmDialog] = useState<{
    isOpen: boolean;
    conversation: Conversation;
    action: 'block' | 'unblock';
  } | null>(null);

  // Host Image Attachment State
  const [hostImage, setHostImage] = useState<string | null>(null);
  const [hostImageName, setHostImageName] = useState<string | null>(null);
  const [isCompressingHostImage, setIsCompressingHostImage] = useState(false);
  const hostFileInputRef = useRef<HTMLInputElement>(null);

  // Full-resolution Lightbox viewer modal
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    sender: string;
    time: string;
    caption?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hostMessagesEndRef = useRef<HTMLDivElement>(null);

  // Merge Firestore messages with optimistic sending/failed local messages (deduplicated by ID)
  const messages = useMemo(() => {
    const confirmedIds = new Set(firestoreMessages.map((m) => m.id));
    const pendingOrFailed = Object.values(localOutboundMessages).filter(
      (m) => !confirmedIds.has(m.id)
    );
    return [...firestoreMessages, ...pendingOrFailed].sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
  }, [firestoreMessages, localOutboundMessages]);

  const hostMessages = useMemo(() => {
    const confirmedIds = new Set(hostFirestoreMessages.map((m) => m.id));
    const pendingOrFailed = Object.values(hostLocalOutbound).filter(
      (m) => !confirmedIds.has(m.id)
    );
    return [...hostFirestoreMessages, ...pendingOrFailed].sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
  }, [hostFirestoreMessages, hostLocalOutbound]);

  // Initialize Visitor State & Real-Time Firestore Listeners
  useEffect(() => {
    if (!isOpen) return;

    let unsubConv: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;
    let active = true;

    async function initVisitorChat() {
      setConnectionError(null);
      try {
        const user = await ensureAnonymousAuth();
        if (!active) return;

        setVisitorId(user.uid);

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
          await setDoc(
            convRef,
            {
              id: convId,
              visitorId: user.uid,
              visitorName: initialName,
              status: 'accepted',
              isBlocked: false,
              submittedAt: now,
              lastMessageText: '',
              lastMessageTime: now,
              unreadAdminCount: 0,
              unreadVisitorCount: 0,
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        if (!active) return;

        // Subscribe to real-time messages directly from Firestore
        unsubMsgs = subscribeToRealMessages(
          convId,
          (realMsgs) => {
            setFirestoreMessages(realMsgs);
            // Clear confirmed messages from local pending map
            setLocalOutboundMessages((prev) => {
              const next = { ...prev };
              let changed = false;
              for (const m of realMsgs) {
                if (next[m.id]) {
                  delete next[m.id];
                  changed = true;
                }
              }
              return changed ? next : prev;
            });
          },
          (err) => {
            console.error('Visitor real-time messages listener failed:', err);
            setConnectionError('Unable to sync messages with Firebase: ' + err.message);
          }
        );

        // Subscribe to conversation metadata
        unsubConv = subscribeToVisitorConversation(
          convId,
          (conv) => {
            if (conv) {
              setIsVisitorBlocked(!!conv.isBlocked);
              if (conv.visitorName) {
                setVisitorName(conv.visitorName);
              }
              if ((conv.unreadVisitorCount ?? 0) > 0) {
                markMessagesAsRead(convId, 'visitor');
              }
            }
          },
          (err) => {
            console.error('Visitor conversation listener failed:', err);
          }
        );
      } catch (err) {
        console.error('Failed to initialize direct private chat:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setConnectionError(`Chat initialization failed: ${msg}`);
      }
    }

    initVisitorChat();

    return () => {
      active = false;
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

    const unsubAll = subscribeToAllAdminConversations(
      (convs) => {
        setAllConversations(convs);
        if (selectedVisitorConv) {
          const refreshed = convs.find((c) => c.id === selectedVisitorConv.id);
          if (refreshed) {
            setSelectedVisitorConv(refreshed);
          }
        }
      },
      (err) => {
        console.error('Host conversations listener failed:', err);
        setHostSendError('Failed to load conversations: ' + err.message);
      }
    );

    return () => {
      unsubAll();
    };
  }, [isOpen, viewMode, hostUnlocked]);

  // Host Real-Time Messages Listener for Selected Visitor
  useEffect(() => {
    if (!selectedVisitorConv) return;
    markMessagesAsRead(selectedVisitorConv.id, 'admin');
    const unsub = subscribeToRealMessages(
      selectedVisitorConv.id,
      (msgs) => {
        setHostFirestoreMessages(msgs);
        setHostLocalOutbound((prev) => {
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
        console.error('Host messages listener failed:', err);
        setHostSendError('Failed to load thread messages: ' + err.message);
      }
    );
    return () => unsub();
  }, [selectedVisitorConv?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, visitorImage]);

  useEffect(() => {
    hostMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hostMessages.length, hostImage]);

  // Image File Selection Handler
  const handleImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'visitor' | 'host'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (mode === 'visitor') {
        setSendError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      } else {
        setHostSendError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      }
      return;
    }

    if (mode === 'visitor') {
      setIsCompressingVisitorImage(true);
      setSendError(null);
    } else {
      setIsCompressingHostImage(true);
      setHostSendError(null);
    }

    try {
      const compressed = await compressImageFile(file, 1080, 0.8);
      if (mode === 'visitor') {
        setVisitorImage(compressed);
        setVisitorImageName(file.name);
      } else {
        setHostImage(compressed);
        setHostImageName(file.name);
      }
    } catch (err) {
      console.error('Image compression error:', err);
      if (mode === 'visitor') {
        setSendError('Failed to prepare image for sending. Please try another image.');
      } else {
        setHostSendError('Failed to prepare image for sending.');
      }
    } finally {
      if (mode === 'visitor') {
        setIsCompressingVisitorImage(false);
      } else {
        setIsCompressingHostImage(false);
      }
      e.target.value = '';
    }
  };

  // Clipboard Paste Image Handler
  const handlePasteImage = async (
    e: React.ClipboardEvent,
    mode: 'visitor' | 'host'
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          if (mode === 'visitor') {
            setIsCompressingVisitorImage(true);
            setSendError(null);
          } else {
            setIsCompressingHostImage(true);
          }
          try {
            const compressed = await compressImageFile(file, 1080, 0.8);
            if (mode === 'visitor') {
              setVisitorImage(compressed);
              setVisitorImageName('Pasted snapshot');
            } else {
              setHostImage(compressed);
              setHostImageName('Pasted snapshot');
            }
          } catch (err) {
            console.error('Image paste compression error:', err);
          } finally {
            if (mode === 'visitor') {
              setIsCompressingVisitorImage(false);
            } else {
              setIsCompressingHostImage(false);
            }
          }
          break;
        }
      }
    }
  };

  // Transmit message with explicit messageId for idempotent retries
  const transmitVisitorMessage = async (
    messageId: string,
    convId: string,
    text: string,
    imageToSend?: string
  ) => {
    const now = new Date().toISOString();
    const pendingMsg: Message = {
      id: messageId,
      conversationId: convId,
      from: 'visitor',
      senderId: visitorId,
      senderName: visitorName,
      text,
      time: now,
      real: true,
      createdAt: now,
      deliveryStatus: 'sending',
      ...(imageToSend ? { imageUrl: imageToSend } : {}),
    };

    setLocalOutboundMessages((prev) => ({
      ...prev,
      [messageId]: pendingMsg,
    }));
    setIsSending(true);
    setSendError(null);

    try {
      await sendRealHumanMessage(
        convId,
        'visitor',
        visitorId,
        visitorName,
        text,
        imageToSend,
        undefined,
        messageId
      );

      // Update local state to 'sent' until Firestore snapshot marks it 'delivered'
      setLocalOutboundMessages((prev) => {
        if (!prev[messageId]) return prev;
        return {
          ...prev,
          [messageId]: {
            ...prev[messageId],
            deliveryStatus: 'sent',
            errorReason: undefined,
          },
        };
      });

      updateLocalChatBackup({
        visitorId,
        visitorName,
        conversationId: convId,
      });
    } catch (err) {
      console.error('Firebase visitor message delivery failure:', err);
      const userErr = formatErrorForUser(err);
      setSendError(userErr);
      setLocalOutboundMessages((prev) => ({
        ...prev,
        [messageId]: {
          ...pendingMsg,
          deliveryStatus: 'failed',
          errorReason: userErr,
        },
      }));
    } finally {
      setIsSending(false);
    }
  };

  // Visitor: Send Real Message (Text, Image, or both)
  const handleVisitorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVisitorBlocked || (!inputMessage.trim() && !visitorImage) || !visitorId || isSending) return;

    const text = inputMessage.trim();
    const imageToSend = visitorImage || undefined;
    const convId = `conv_${visitorId}`;
    const messageId = createMessageId();

    setInputMessage('');
    setVisitorImage(null);
    setVisitorImageName(null);

    await transmitVisitorMessage(messageId, convId, text, imageToSend);
  };

  // Visitor: Idempotent Retry of a specific failed message (never duplicates)
  const handleRetryVisitorMessage = async (failedMsg: Message) => {
    if (isSending || isVisitorBlocked) return;
    await transmitVisitorMessage(
      failedMsg.id,
      failedMsg.conversationId,
      failedMsg.text,
      failedMsg.imageUrl
    );
  };

  // Host: Transmit reply with explicit messageId for idempotent retries
  const transmitHostReply = async (
    messageId: string,
    convId: string,
    text: string,
    imageToSend?: string
  ) => {
    const now = new Date().toISOString();
    const senderUid = auth.currentUser?.uid || visitorId || 'admin';
    const pendingMsg: Message = {
      id: messageId,
      conversationId: convId,
      from: 'admin',
      senderId: senderUid,
      senderName: 'Elon Musk',
      text,
      time: now,
      real: true,
      createdAt: now,
      deliveryStatus: 'sending',
      ...(imageToSend ? { imageUrl: imageToSend } : {}),
    };

    setHostLocalOutbound((prev) => ({
      ...prev,
      [messageId]: pendingMsg,
    }));
    setIsHostSending(true);
    setHostSendError(null);

    try {
      await sendRealHumanMessage(
        convId,
        'admin',
        senderUid,
        'Elon Musk',
        text,
        imageToSend,
        undefined,
        messageId
      );

      setHostLocalOutbound((prev) => {
        if (!prev[messageId]) return prev;
        return {
          ...prev,
          [messageId]: {
            ...prev[messageId],
            deliveryStatus: 'sent',
            errorReason: undefined,
          },
        };
      });
    } catch (err) {
      console.error('Firebase host reply delivery failure:', err);
      const userErr = formatErrorForUser(err);
      setHostSendError(userErr);
      setHostLocalOutbound((prev) => ({
        ...prev,
        [messageId]: {
          ...pendingMsg,
          deliveryStatus: 'failed',
          errorReason: userErr,
        },
      }));
    } finally {
      setIsHostSending(false);
    }
  };

  // Host: Send Real Reply directly to Visitor (Text, Image, or both)
  const handleHostSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!hostReplyText.trim() && !hostImage) || !selectedVisitorConv || isHostSending) return;

    const text = hostReplyText.trim();
    const imageToSend = hostImage || undefined;
    const messageId = createMessageId();

    setHostReplyText('');
    setHostImage(null);
    setHostImageName(null);

    await transmitHostReply(messageId, selectedVisitorConv.id, text, imageToSend);
  };

  // Host: Retry failed reply without creating duplicates
  const handleRetryHostMessage = async (failedMsg: Message) => {
    if (isHostSending) return;
    await transmitHostReply(
      failedMsg.id,
      failedMsg.conversationId,
      failedMsg.text,
      failedMsg.imageUrl
    );
  };

  // Host: Toggle Block status with confirmation
  const handleHostBlockToggle = async () => {
    if (!hostBlockConfirmDialog) return;
    const { conversation, action } = hostBlockConfirmDialog;
    const shouldBlock = action === 'block';
    try {
      await toggleBlockConversation(conversation.id, shouldBlock);
      setSelectedVisitorConv((prev) =>
        prev && prev.id === conversation.id ? { ...prev, isBlocked: shouldBlock } : prev
      );
      setAllConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, isBlocked: shouldBlock } : c))
      );
      setHostBlockConfirmDialog(null);
    } catch (err) {
      console.error('Failed to update block status in host view:', err);
      setHostSendError('Failed to update block status. Ensure owner session is active.');
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
      } catch (err) {
        console.warn('Could not update visitor name in Firestore:', err);
      }
    }
  };

  // Host Login via Genuine Google Owner Authentication (strictly restricted to authorized admin email)
  const handleHostGoogleLogin = async () => {
    setHostAuthLoading(true);
    setHostLoginError(null);
    try {
      const user = await signInWithGoogle();
      const authorized = (await checkIsAdmin(user)) && isAuthorizedOwnerEmail(user.email);

      if (authorized) {
        setHostUnlocked(true);
        setShowHostLogin(false);
        setViewMode('host');
      } else {
        await signOut(auth);
        setHostLoginError(
          `Access Denied: "${user.email || user.uid}" is not the authorized administrator.`
        );
      }
    } catch (err: unknown) {
      console.error('Host Google Sign-In error:', err);
      const fbErr = err as { code?: string; message?: string };
      if (fbErr?.code === 'auth/access-denied') {
        setHostLoginError('Access Denied: Only the authorized administrator account may access the Host Inbox.');
      } else if (fbErr?.code === 'auth/popup-blocked') {
        setHostLoginError('Popup blocked by browser. Please allow popups and try again.');
      } else if (fbErr?.code === 'auth/popup-closed-by-user') {
        setHostLoginError('Sign-in cancelled before completion.');
      } else if (fbErr?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setHostLoginError(
          `Domain Configuration Error: "${host}" must be added in Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else {
        setHostLoginError(fbErr?.message || 'Access Denied: Google authentication failed.');
      }
    } finally {
      setHostAuthLoading(false);
    }
  };

  // Export JSON backup
  const handleExportChats = async () => {
    try {
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
    } catch (err) {
      console.error('Export failed:', err);
      setExportNotice('Export failed: Permission denied or network issue.');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  if (!isOpen) return null;

  const failedVisitorMessages = messages.filter((m) => m.deliveryStatus === 'failed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      {/* Strict Monochrome Black & White Window */}
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[700px] bg-black text-white border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Firestore Real-Time Chat & Media</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Host Inbox Switcher for Authorized Website Owner */}
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
                onClick={() => {
                  setHostLoginError(null);
                  setShowHostLogin(true);
                }}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Owner Inbox Sign-In"
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
                <span>Persistent Thread</span>
              </div>
            </div>

            {connectionError && (
              <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs font-mono">
                {connectionError}
              </div>
            )}

            {/* Direct Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-black">
              {messages.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 text-xs font-mono max-w-sm mx-auto leading-relaxed">
                  <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center mx-auto mb-3 text-white font-bold text-sm">
                    EM
                  </div>
                  <strong className="text-white block mb-1 text-sm">Direct Line to Elon Musk</strong>
                  Type your message or share an image below. All messages and photos are saved and delivered in real time.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.from === 'visitor';
                  const formattedTime = m.time
                    ? new Date(m.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  const isFailed = m.deliveryStatus === 'failed';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-zinc-500 mb-1 px-1 font-mono flex items-center gap-1.5">
                        <span>{isMe ? visitorName : 'Elon Musk'}</span>
                        <span>·</span>
                        <span>{formattedTime}</span>
                        {isMe && m.deliveryStatus === 'sending' && (
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Sending
                          </span>
                        )}
                        {isMe && m.deliveryStatus === 'sent' && (
                          <span className="inline-flex items-center gap-0.5 text-zinc-400">
                            <Check className="w-3 h-3" /> Sent
                          </span>
                        )}
                        {isMe && (!m.deliveryStatus || m.deliveryStatus === 'delivered') && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-400">
                            <CheckCheck className="w-3 h-3" /> Delivered
                          </span>
                        )}
                        {isMe && isFailed && (
                          <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? isFailed
                              ? 'bg-rose-950/70 text-white border border-rose-700 rounded-tr-none'
                              : 'bg-zinc-900 text-white border border-zinc-800 rounded-tr-none'
                            : 'bg-white text-black font-medium rounded-tl-none'
                        }`}
                      >
                        {/* Sent Image Attachment */}
                        {m.imageUrl && (
                          <div
                            onClick={() =>
                              setLightboxImage({
                                url: m.imageUrl!,
                                sender: isMe ? visitorName : 'Elon Musk',
                                time: formattedTime,
                                caption: m.text,
                              })
                            }
                            className="relative group cursor-pointer mb-2 rounded-xl overflow-hidden bg-black/60 border border-zinc-800/80 shadow-md transition-transform active:scale-[0.99]"
                          >
                            <img
                              src={m.imageUrl}
                              alt="Shared attachment"
                              className="w-full max-h-64 sm:max-h-72 object-cover transition-opacity group-hover:opacity-95"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-mono text-xs">
                              <Maximize2 className="w-4 h-4" />
                              <span>View Full Size</span>
                            </div>
                          </div>
                        )}

                        {m.text && <p className="whitespace-pre-wrap break-words px-1">{m.text}</p>}

                        {isMe && isFailed && (
                          <div className="mt-2 pt-2 border-t border-rose-800/70 flex items-center justify-between gap-3 text-[11px] font-mono text-rose-200">
                            <span>{m.errorReason || 'Not delivered'}</span>
                            <button
                              type="button"
                              onClick={() => handleRetryVisitorMessage(m)}
                              disabled={isSending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-black font-bold rounded-md hover:bg-zinc-200 cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Banner if a failed message exists */}
            {sendError && failedVisitorMessages.length > 0 && (
              <div className="px-4 py-2 bg-zinc-900 text-rose-200 text-xs border-t border-zinc-800 flex items-center justify-between">
                <span>{sendError}</span>
                <button
                  type="button"
                  onClick={() =>
                    handleRetryVisitorMessage(failedVisitorMessages[failedVisitorMessages.length - 1])
                  }
                  disabled={isSending}
                  className="underline font-bold text-white ml-2 cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Blocked Notification for Visitor */}
            {isVisitorBlocked && (
              <div className="px-4 py-2.5 bg-red-950/80 border-t border-red-800 text-red-200 text-xs font-mono flex items-center gap-2 shrink-0">
                <Ban className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>CONVERSATION BLOCKED:</strong> You have been blocked by the administrator. New messages cannot be sent.
                </span>
              </div>
            )}

            {/* Attached Image Preview Strip */}
            {visitorImage && (
              <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <img
                      src={visitorImage}
                      alt="Attachment preview"
                      className="w-12 h-12 object-cover rounded-lg border border-zinc-700 shadow-sm"
                    />
                  </div>
                  <div className="text-xs">
                    <div className="text-white font-medium truncate max-w-[200px] sm:max-w-[320px]">
                      {visitorImageName || 'Image attached'}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Image ready to send with message
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVisitorImage(null);
                    setVisitorImageName(null);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
                  title="Remove attached image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar with Image Send Button */}
            <form
              onSubmit={handleVisitorSend}
              className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
            >
              <input
                type="file"
                ref={visitorFileInputRef}
                onChange={(e) => handleImageFileSelect(e, 'visitor')}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />

              {/* Attach Image Button */}
              <button
                type="button"
                onClick={() => visitorFileInputRef.current?.click()}
                disabled={isVisitorBlocked || isCompressingVisitorImage || isSending}
                className={`p-3 rounded-xl border border-zinc-800 transition-colors cursor-pointer shrink-0 ${
                  isVisitorBlocked
                    ? 'opacity-30 cursor-not-allowed bg-zinc-900 text-zinc-600'
                    : visitorImage
                    ? 'bg-white text-black font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={isVisitorBlocked ? 'Blocked by administrator' : 'Send image or photo (PNG, JPG, WebP)'}
              >
                {isCompressingVisitorImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>

              <input
                type="text"
                disabled={isVisitorBlocked}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onPaste={(e) => !isVisitorBlocked && handlePasteImage(e, 'visitor')}
                placeholder={
                  isVisitorBlocked
                    ? 'This private line is currently blocked by administrator...'
                    : visitorImage
                    ? 'Add an optional caption...'
                    : 'Type your message or paste an image...'
                }
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={isVisitorBlocked || (!inputMessage.trim() && !visitorImage) || isSending || isCompressingVisitorImage}
                className="px-6 py-3 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-40 shrink-0 flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>SENDING</span>
                  </>
                ) : (
                  <span>SEND</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ------------------- HOST VIEW (FOR OWNER TO CHAT WITH VISITORS) ------------------- */}
        {viewMode === 'host' && hostUnlocked && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black">
            {/* Left: Visitor Conversations List */}
            <div className="w-full md:w-64 border-r border-zinc-800 flex flex-col overflow-hidden shrink-0 bg-zinc-950 max-h-48 md:max-h-full">
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
                    const updatedStr = c.updatedAt
                      ? new Date(c.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
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
                          <span className="text-[10px] font-mono text-zinc-500">{updatedStr}</span>
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
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">
                        {selectedVisitorConv.visitorName || 'Visitor'}
                      </span>
                      <span className="text-zinc-500 hidden sm:inline">
                        ID: {(selectedVisitorConv.visitorId || '').slice(0, 10)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedVisitorConv.isBlocked ? (
                        <span className="text-red-400 font-bold text-[10px] bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          BLOCKED
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setHostBlockConfirmDialog({
                            isOpen: true,
                            conversation: selectedVisitorConv,
                            action: selectedVisitorConv.isBlocked ? 'unblock' : 'block',
                          })
                        }
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                          selectedVisitorConv.isBlocked
                            ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white'
                            : 'bg-red-950/70 text-red-300 border-red-800 hover:bg-red-900 hover:text-white'
                        }`}
                      >
                        {selectedVisitorConv.isBlocked ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block Visitor</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
                    {hostMessages.map((m) => {
                      const isHost = m.from === 'admin';
                      const formattedTime = m.time
                        ? new Date(m.time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      const isFailed = m.deliveryStatus === 'failed';

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isHost ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-[10px] text-zinc-500 mb-1 px-1 font-mono flex items-center gap-1.5">
                            <span>{isHost ? 'You (Elon Musk)' : selectedVisitorConv.visitorName}</span>
                            <span>·</span>
                            <span>{formattedTime}</span>
                            {isHost && m.deliveryStatus === 'sending' && (
                              <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Sending
                              </span>
                            )}
                            {isHost && m.deliveryStatus === 'sent' && (
                              <span className="inline-flex items-center gap-0.5 text-zinc-400">
                                <Check className="w-3 h-3" /> Sent
                              </span>
                            )}
                            {isHost && (!m.deliveryStatus || m.deliveryStatus === 'delivered') && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-400">
                                <CheckCheck className="w-3 h-3" /> Delivered
                              </span>
                            )}
                            {isHost && isFailed && (
                              <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold">
                                <AlertCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                              isHost
                                ? isFailed
                                  ? 'bg-rose-950/70 text-white border border-rose-700 rounded-tr-none'
                                  : 'bg-white text-black font-medium rounded-tr-none'
                                : 'bg-zinc-900 text-white border border-zinc-800 rounded-tl-none'
                            }`}
                          >
                            {m.imageUrl && (
                              <div
                                onClick={() =>
                                  setLightboxImage({
                                    url: m.imageUrl!,
                                    sender: isHost ? 'You (Elon Musk)' : selectedVisitorConv.visitorName,
                                    time: formattedTime,
                                    caption: m.text,
                                  })
                                }
                                className="relative group cursor-pointer mb-2 rounded-xl overflow-hidden bg-black/60 border border-zinc-800/80 shadow-md transition-transform active:scale-[0.99]"
                              >
                                <img
                                  src={m.imageUrl}
                                  alt="Shared attachment"
                                  className="w-full max-h-60 object-cover transition-opacity group-hover:opacity-95"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-mono text-xs">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>View Full Size</span>
                                </div>
                              </div>
                            )}

                            {m.text && <p className="whitespace-pre-wrap break-words px-1">{m.text}</p>}

                            {isHost && isFailed && (
                              <div className="mt-2 pt-2 border-t border-rose-800/70 flex items-center justify-between gap-3 text-[11px] font-mono text-rose-200">
                                <span>{m.errorReason || 'Not delivered'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRetryHostMessage(m)}
                                  disabled={isHostSending}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-black font-bold rounded-md hover:bg-zinc-200 cursor-pointer shrink-0 disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div ref={hostMessagesEndRef} />
                  </div>

                  {hostSendError && (
                    <div className="px-4 py-2 bg-rose-950/70 text-rose-200 text-xs border-t border-rose-800">
                      {hostSendError}
                    </div>
                  )}

                  {/* Attached Image Preview for Host */}
                  {hostImage && (
                    <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={hostImage}
                          alt="Attachment preview"
                          className="w-10 h-10 object-cover rounded-lg border border-zinc-700"
                        />
                        <div className="text-xs">
                          <div className="text-white font-medium truncate max-w-[220px]">
                            {hostImageName || 'Image attached'}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            Ready to transmit
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHostImage(null);
                          setHostImageName(null);
                        }}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Reply Input Bar */}
                  <form
                    onSubmit={handleHostSendReply}
                    className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="file"
                      ref={hostFileInputRef}
                      onChange={(e) => handleImageFileSelect(e, 'host')}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => hostFileInputRef.current?.click()}
                      disabled={isCompressingHostImage || isHostSending}
                      className={`p-2.5 rounded-xl border border-zinc-800 transition-colors cursor-pointer shrink-0 ${
                        hostImage
                          ? 'bg-white text-black font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                      title="Attach image"
                    >
                      {isCompressingHostImage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={hostReplyText}
                      onChange={(e) => setHostReplyText(e.target.value)}
                      onPaste={(e) => handlePasteImage(e, 'host')}
                      placeholder={`Reply directly to ${selectedVisitorConv.visitorName}...`}
                      className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={(!hostReplyText.trim() && !hostImage) || isHostSending || isCompressingHostImage}
                      className="px-5 py-2.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {isHostSending ? 'SENDING...' : 'SEND'}
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

        {/* Host Login Modal Overlay (Secured by Google Firebase Auth) */}
        {showHostLogin && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center items-center z-30">
            <div className="max-w-sm w-full bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-extrabold text-white">Owner Inbox Access</h4>
                <button
                  onClick={() => setShowHostLogin(false)}
                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Sign in with the authorized website owner Google account to view and reply to all visitor messages.
              </p>

              {hostLoginError && (
                <div className="mb-3 p-2.5 bg-red-950/70 border border-red-800 rounded-lg text-red-200 text-xs">
                  {hostLoginError}
                </div>
              )}

              <button
                type="button"
                onClick={handleHostGoogleLogin}
                disabled={hostAuthLoading}
                className="w-full py-3 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{hostAuthLoading ? 'Verifying with Google...' : 'Sign In as Website Owner'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Host Block/Unblock Confirmation Dialog */}
        {hostBlockConfirmDialog && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center items-center z-40">
            <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    hostBlockConfirmDialog.action === 'block'
                      ? 'bg-red-950/80 text-red-400 border border-red-800'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    {hostBlockConfirmDialog.action === 'block'
                      ? 'Block Visitor from Messaging?'
                      : 'Unblock Visitor?'}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">
                    {hostBlockConfirmDialog.conversation.visitorName || 'Visitor'} (
                    {(hostBlockConfirmDialog.conversation.visitorId || '').slice(0, 10)}...)
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-5">
                {hostBlockConfirmDialog.action === 'block'
                  ? 'Blocking this visitor will permanently restrict them from transmitting new messages or media on their private line. Their existing conversation history will remain safely preserved in Firebase.'
                  : 'Unblocking this visitor will immediately restore their access to send new messages and share media on this private channel.'}
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setHostBlockConfirmDialog(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleHostBlockToggle}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm ${
                    hostBlockConfirmDialog.action === 'block'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {hostBlockConfirmDialog.action === 'block'
                    ? 'Confirm Block'
                    : 'Confirm Unblock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High-Resolution Image Lightbox Modal */}
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6"
          >
            <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">{lightboxImage.sender}</span>
                <span className="text-xs text-zinc-400 font-mono">· {lightboxImage.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImage.url}
                  download={`image_${Date.now()}.jpg`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Image</span>
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 max-w-4xl max-h-[76vh] overflow-hidden my-auto">
              <img
                src={lightboxImage.url}
                alt="Enlarged view"
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {lightboxImage.caption && (
              <div className="w-full max-w-4xl text-center text-xs text-zinc-300 font-mono py-2 bg-zinc-950/80 rounded-lg border border-zinc-800 px-4 shrink-0">
                {lightboxImage.caption}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
