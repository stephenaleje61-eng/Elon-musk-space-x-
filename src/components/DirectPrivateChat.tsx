import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Camera,
  Paperclip,
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  X,
  Lock,
  Info,
  Edit3,
  Copy,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import {
  ensureAnonymousAuth,
} from '../firebase/auth';
import {
  ensureVisitorConversation,
  getLocalChatBackup,
  updateLocalChatBackup,
  subscribeToVisitorConversation,
  subscribeToRealMessages,
  sendDirectPrivateMessage,
  createMessageId,
  markMessagesAsRead,
} from '../firebase/chatService';
import {
  uploadImage,
  uploadAudioBlob,
  compressImageFile,
} from '../firebase/storage';
import { Conversation, Message } from '../types';

export const OFFICIAL_WELCOME_MESSAGE =
  'Welcome to Elon Musk Space. Thank you for reaching out. You can send your message here, and our communication team will respond when available.';

interface DirectPrivateChatProps {
  variant?: 'embedded' | 'fullscreen';
  initialDraft?: string;
  onClearDraft?: () => void;
  onBackToMarketplace?: () => void;
  onToggleExpand?: () => void;
}

function formatTimeShort(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso?: string): string {
  if (!iso) return 'Today';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Today';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDurationSec(secs?: number): string {
  const s = Math.max(0, Math.round(secs || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatFriendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Delivery blocked by Firestore permissions. Please tap Retry.';
  }
  if (msg.includes('too long') || msg.includes('1048576')) {
    return msg;
  }
  return 'Could not deliver message. Please check connection and tap Retry.';
}

const VoiceMessagePlayer: React.FC<{
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}> = ({ audioUrl, duration, isMe }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setTotalDuration(el.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        await el.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio playback notice:', err);
      }
    }
  };

  const progressPct =
    totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return (
    <div className="flex items-center gap-3 min-w-[210px] sm:min-w-[240px] py-1">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          isMe
            ? 'bg-cyan-400 text-black hover:bg-cyan-300'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden cursor-pointer relative"
          onClick={(e) => {
            const el = audioRef.current;
            if (!el || totalDuration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            el.currentTime = ratio * totalDuration;
            setCurrentTime(el.currentTime);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
          <span>{isPlaying ? formatDurationSec(currentTime) : formatDurationSec(totalDuration)}</span>
          <span className="text-cyan-400/90">Voice Note</span>
        </div>
      </div>
    </div>
  );
};

export const DirectPrivateChat: React.FC<DirectPrivateChatProps> = ({
  variant = 'embedded',
  initialDraft,
  onClearDraft,
  onBackToMarketplace,
  onToggleExpand,
}) => {
  const [visitorId, setVisitorId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('Visitor');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showThreadInfo, setShowThreadInfo] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const [localOutboundMessages, setLocalOutboundMessages] = useState<Record<string, Message>>({});
  const [isSynced, setIsSynced] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Composer State
  const [inputMessage, setInputMessage] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Voice Recording State
  const voiceSupported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);

  // Camera Viewfinder State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Lightbox Viewer
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    sender: string;
    time: string;
    caption?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Apply external draft when triggered from a product inquiry button
  useEffect(() => {
    if (initialDraft && initialDraft.trim()) {
      setInputMessage(initialDraft.trim());
      if (onClearDraft) onClearDraft();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [initialDraft, onClearDraft]);

  // Merge Firestore messages + optimistic outbound states (idempotent deduplication by ID)
  const messages = useMemo(() => {
    const confirmedIds = new Set(firestoreMessages.map((m) => m.id));
    const pendingOrFailed = Object.values(localOutboundMessages).filter(
      (m) => !confirmedIds.has(m.id)
    );
    return [...firestoreMessages, ...pendingOrFailed].sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );
  }, [firestoreMessages, localOutboundMessages]);

  // Initialize Visitor Session & Real-Time Firestore Listeners
  useEffect(() => {
    let unsubConv: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;
    let active = true;

    async function initDirectChat() {
      setConnectionError(null);
      try {
        const user = await ensureAnonymousAuth();
        if (!active) return;

        const uid = user.uid;
        setVisitorId(uid);

        const backup = getLocalChatBackup();
        const initialName = backup.visitorName || `Visitor #${uid.slice(0, 4).toUpperCase()}`;
        setVisitorName(initialName);
        setTempName(initialName);

        const convId = await ensureVisitorConversation(uid, initialName);
        if (!active) return;
        setConversationId(convId);

        unsubMsgs = subscribeToRealMessages(
          convId,
          (realMsgs) => {
            setFirestoreMessages(realMsgs);
            setIsSynced(true);
            setConnectionError(null);
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
            console.error('DirectPrivateChat messages listener error:', err);
            setConnectionError(`Realtime sync issue: ${err.message}`);
          }
        );

        unsubConv = subscribeToVisitorConversation(
          convId,
          (conv) => {
            setConversation(conv);
            if (conv?.visitorName) {
              setVisitorName(conv.visitorName);
            }
            if (conv && (conv.unreadVisitorCount ?? 0) > 0) {
              markMessagesAsRead(convId, 'visitor');
            }
          },
          (err) => {
            console.error('DirectPrivateChat conversation listener error:', err);
          }
        );
      } catch (err) {
        console.error('DirectPrivateChat initialization failed:', err);
        setConnectionError(
          `Connection interrupted: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    initDirectChat();

    return () => {
      active = false;
      if (unsubConv) unsubConv();
      if (unsubMsgs) unsubMsgs();
    };
  }, []);

  // Clean up object URLs & active camera/recording streams on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, []);

  // Scroll to bottom smoothly when new messages arrive
  useEffect(() => {
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, pendingImagePreview, recordedAudioUrl]);

  // Auto-resize composer textarea cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(130, Math.max(46, el.scrollHeight))}px`;
  }, [inputMessage]);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  };

  const handleOpenCamera = async () => {
    setSendError(null);
    setCameraError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      nativeCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraModalOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      // Fall back smoothly to native OS camera / photo capture
      nativeCameraInputRef.current?.click();
    }
  };

  const handleCaptureCameraPhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCameraStream();
        setCameraModalOpen(false);
        await prepareImageAttachment(file);
      },
      'image/jpeg',
      0.86
    );
  };

  const prepareImageAttachment = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSendError('Please select a valid picture (PNG, JPG, WebP, or GIF).');
      return;
    }
    setIsPreparingImage(true);
    setSendError(null);
    try {
      const previewDataUrl = await compressImageFile(file, 1080, 0.82);
      setPendingImageFile(file);
      setPendingImagePreview(previewDataUrl);
      setPendingImageName(file.name);
    } catch (err) {
      console.error('Image preparation failed:', err);
      setSendError('Failed to process selected image. Please choose another picture.');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await prepareImageAttachment(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await prepareImageAttachment(file);
          break;
        }
      }
    }
  };

  // Voice Recording Handlers
  const startVoiceRecording = async () => {
    if (!voiceSupported) {
      setSendError('Voice recording is not supported in this browser.');
      return;
    }
    setSendError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        const elapsedSec = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size > 0) {
          if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
          setRecordedAudioBlob(blob);
          setRecordedAudioUrl(URL.createObjectURL(blob));
          setRecordedDuration(elapsedSec);
        }
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start(250);

      recordingTimerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        setRecordingSeconds(secs);
        if (secs >= 40 && recorder.state === 'recording') {
          recorder.stop();
        }
      }, 250);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setSendError('Microphone permission denied or unavailable on this device.');
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    }
  };

  const discardVoiceRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.ondataavailable = null;
      rec.onstop = () => {
        rec.stream?.getTracks().forEach((t) => t.stop());
      };
      rec.stop();
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordedDuration(0);
  };

  // Transmit Message (Text, Image, or Voice) with Idempotent Retries
  const transmitMessage = async (opts: {
    messageId: string;
    convId: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
  }) => {
    const now = new Date().toISOString();
    const pendingMsg: Message = {
      id: opts.messageId,
      conversationId: opts.convId,
      from: 'visitor',
      senderId: visitorId,
      senderName: visitorName,
      text: opts.text,
      messageType: opts.audioUrl ? 'voice' : opts.imageUrl ? 'image' : 'text',
      time: now,
      real: true,
      createdAt: now,
      deliveryStatus: 'sending',
      ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}),
      ...(opts.audioUrl ? { audioUrl: opts.audioUrl } : {}),
      ...(typeof opts.audioDuration === 'number' ? { audioDuration: opts.audioDuration } : {}),
    };

    setLocalOutboundMessages((prev) => ({ ...prev, [opts.messageId]: pendingMsg }));
    setIsSending(true);
    setSendError(null);

    try {
      await sendDirectPrivateMessage({
        conversationId: opts.convId,
        from: 'visitor',
        senderId: visitorId,
        senderName: visitorName,
        text: opts.text,
        imageUrl: opts.imageUrl,
        audioUrl: opts.audioUrl,
        audioDuration: opts.audioDuration,
        existingMessageId: opts.messageId,
      });

      setLocalOutboundMessages((prev) => {
        if (!prev[opts.messageId]) return prev;
        return {
          ...prev,
          [opts.messageId]: {
            ...prev[opts.messageId],
            deliveryStatus: 'sent',
            errorReason: undefined,
          },
        };
      });

      updateLocalChatBackup({
        visitorId,
        visitorName,
        conversationId: opts.convId,
      });
    } catch (err) {
      console.error('DirectPrivateChat send failure:', err);
      const userErr = formatFriendlyError(err);
      setSendError(userErr);
      setLocalOutboundMessages((prev) => ({
        ...prev,
        [opts.messageId]: {
          ...pendingMsg,
          deliveryStatus: 'failed',
          errorReason: userErr,
        },
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending || isPreparingImage) return;

    const trimmed = inputMessage.trim();
    if (!trimmed && !pendingImagePreview && !recordedAudioBlob) return;

    let activeConvId = conversationId;
    let activeVisitorId = visitorId;
    if (!activeConvId || !activeVisitorId) {
      const user = await ensureAnonymousAuth();
      activeVisitorId = user.uid;
      activeConvId = await ensureVisitorConversation(user.uid, visitorName);
      setVisitorId(activeVisitorId);
      setConversationId(activeConvId);
    }

    const messageId = createMessageId();
    const imgFile = pendingImageFile;
    const imgFallback = pendingImagePreview;
    const audioBlob = recordedAudioBlob;
    const audioSecs = recordedDuration;

    // Reset composer immediately for smooth UX
    setInputMessage('');
    setPendingImageFile(null);
    setPendingImagePreview(null);
    setPendingImageName(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordedDuration(0);

    let finalImageUrl: string | undefined = imgFallback || undefined;
    let finalAudioUrl: string | undefined = undefined;

    try {
      setIsSending(true);
      if (imgFile) {
        finalImageUrl = await uploadImage(imgFile, `chat_media/${activeConvId}`);
      }
      if (audioBlob) {
        finalAudioUrl = await uploadAudioBlob(audioBlob, `chat_audio/${activeConvId}`);
      }
    } catch (uploadErr) {
      const msg = formatFriendlyError(uploadErr);
      setSendError(msg);
      setIsSending(false);
      return;
    }

    await transmitMessage({
      messageId,
      convId: activeConvId,
      text: trimmed,
      imageUrl: finalImageUrl,
      audioUrl: finalAudioUrl,
      audioDuration: audioBlob ? audioSecs : undefined,
    });
  };

  const handleRetryMessage = async (failedMsg: Message) => {
    if (isSending) return;
    await transmitMessage({
      messageId: failedMsg.id,
      convId: failedMsg.conversationId || conversationId,
      text: failedMsg.text,
      imageUrl: failedMsg.imageUrl,
      audioUrl: failedMsg.audioUrl,
      audioDuration: failedMsg.audioDuration,
    });
  };

  const handleSaveVisitorName = async () => {
    const clean = tempName.trim();
    if (!clean) {
      setIsEditingName(false);
      return;
    }
    setVisitorName(clean);
    setIsEditingName(false);
    updateLocalChatBackup({ visitorName: clean });
    if (visitorId) {
      await ensureVisitorConversation(visitorId, clean).catch(() => {});
    }
  };

  const handleCopyConversationId = async () => {
    if (!conversationId) return;
    try {
      await navigator.clipboard.writeText(conversationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const failedMessages = messages.filter((m) => m.deliveryStatus === 'failed');

  const containerHeightClass =
    variant === 'fullscreen'
      ? 'min-h-[calc(100dvh-64px)] h-[calc(100dvh-64px)] w-full'
      : 'h-[640px] sm:h-[700px] w-full rounded-2xl border border-cyan-500/25 shadow-2xl';

  return (
    <div
      className={`relative bg-black text-white flex flex-col overflow-hidden font-sans ${containerHeightClass}`}
    >
      {/* Top Chat Header — Black Surface + Cyan / Blue Accents */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#05080F] border-b border-cyan-500/20 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {variant === 'fullscreen' && onBackToMarketplace && (
            <button
              type="button"
              onClick={onBackToMarketplace}
              className="p-2 -ml-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-cyan-500/30 transition-colors cursor-pointer shrink-0"
              aria-label="Back to marketplace"
              title="Back to Marketplace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-extrabold text-xs tracking-tight text-cyan-300">
              EM
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-white truncate">
              ELON MUSK – DIRECT PRIVATE CHAT
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 truncate">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSynced ? 'bg-cyan-400' : 'bg-blue-500'
                }`}
              />
              <span className="truncate">
                {isSynced
                  ? 'Real-time Firebase Sync Active · Private Thread'
                  : 'Connecting to Private Channel...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowThreadInfo((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              showThreadInfo
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-cyan-500/30'
            }`}
            aria-label="Conversation details"
            title="View Conversation ID & Display Name"
          >
            <Info className="w-4 h-4" />
          </button>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer"
              aria-label={variant === 'fullscreen' ? 'Exit full view' : 'Open full-screen chat'}
              title={variant === 'fullscreen' ? 'Return to Storefront View' : 'Expand to Full-Screen Chat'}
            >
              {variant === 'fullscreen' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Visitor Identity & Unique Thread ID Strip */}
      <div className="px-4 sm:px-6 py-2 bg-[#070B14] border-b border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-500">Sender:</span>
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveVisitorName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                maxLength={60}
                className="px-2.5 py-0.5 bg-black border border-cyan-500/50 rounded-md text-white text-xs focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveVisitorName}
                className="px-2 py-0.5 bg-cyan-500 text-black font-bold rounded text-[11px] cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempName(visitorName);
                setIsEditingName(true);
              }}
              className="inline-flex items-center gap-1.5 text-white hover:text-cyan-300 font-semibold cursor-pointer truncate"
              title="Click to customize your display name"
            >
              <span className="truncate max-w-[160px] sm:max-w-[260px]">{visitorName}</span>
              <Edit3 className="w-3 h-3 text-cyan-400 shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Lock className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="hidden sm:inline">Private Channel ID:</span>
          <span className="text-zinc-300 tabular-nums">
            {conversationId ? `${conversationId.slice(0, 14)}…` : 'Initializing...'}
          </span>
        </div>
      </div>

      {/* Expandable Thread Details Drawer */}
      {showThreadInfo && (
        <div className="px-4 sm:px-6 py-3 bg-[#09101E] border-b border-cyan-500/25 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Private Session Persistence</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Every message, picture, and voice note is permanently saved under your unique conversation ID and remains private between you and the website recipient across page refreshes.
            </p>
          </div>
          {conversationId && (
            <button
              type="button"
              onClick={handleCopyConversationId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black border border-cyan-500/35 hover:border-cyan-400 text-cyan-300 rounded-lg font-mono text-[11px] cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedId ? 'Copied Thread ID' : conversationId}</span>
            </button>
          )}
        </div>
      )}

      {connectionError && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-700/70 text-rose-200 text-xs font-mono flex items-center justify-between gap-2 shrink-0">
          <span>{connectionError}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 px-2 py-1 bg-rose-900 hover:bg-rose-800 rounded text-[11px] font-bold text-white cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* Message Stream Area (Black Canvas + Subtle Futuristic Grid Glow) */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 space-y-4 bg-black"
      >
        {/* Required Welcome Message Banner at Top of Conversation */}
        <div className="max-w-2xl mx-auto">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#070C17] border border-cyan-500/30 text-left space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              <span>Elon Musk Space · Direct Private Channel</span>
              <span>Real-Time</span>
            </div>
            <p className="text-sm sm:text-[15px] text-white leading-relaxed font-normal">
              {OFFICIAL_WELCOME_MESSAGE}
            </p>
            <div className="text-[11px] text-zinc-400 font-mono">
              Supported: Text messages · Photo uploads & camera · Voice notes · Instant sync across refreshes
            </div>
          </div>
        </div>

        {/* Real Persisted Messages */}
        {messages.map((m, idx) => {
          const isMe = m.from === 'visitor';
          const formattedTime = formatTimeShort(m.time || m.createdAt);
          const dateLabel = formatDateLabel(m.createdAt || m.time);
          const prevDateLabel =
            idx > 0
              ? formatDateLabel(messages[idx - 1].createdAt || messages[idx - 1].time)
              : null;
          const showDateHeader = idx === 0 || dateLabel !== prevDateLabel;
          const isFailed = m.deliveryStatus === 'failed';
          const senderLabel = isMe
            ? visitorName
            : m.senderName && m.senderName !== 'Elon Musk'
            ? m.senderName
            : 'Communication Team';

          return (
            <React.Fragment key={m.id}>
              {showDateHeader && (
                <div className="flex items-center justify-center my-2">
                  <span className="px-3 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 tabular-nums">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="max-w-[88%] sm:max-w-[74%] lg:max-w-[66%] flex flex-col">
                  {/* Sender Label (for incoming replies) */}
                  {!isMe && (
                    <span className="text-[11px] font-mono text-cyan-400 mb-1 px-1">
                      {senderLabel}
                    </span>
                  )}

                  {/* Chat Bubble */}
                  <div
                    className={`rounded-2xl p-3 sm:p-3.5 text-sm leading-relaxed transition-colors ${
                      isMe
                        ? isFailed
                          ? 'bg-rose-950/80 border border-rose-600/80 text-white rounded-br-xs'
                          : 'bg-gradient-to-br from-blue-600/30 via-blue-700/20 to-cyan-500/20 border border-cyan-400/40 text-white rounded-br-xs'
                        : 'bg-[#0C111D] border border-zinc-800 text-zinc-100 rounded-bl-xs'
                    }`}
                  >
                    {/* Picture Attachment */}
                    {m.imageUrl && (
                      <div
                        onClick={() =>
                          setLightboxImage({
                            url: m.imageUrl!,
                            sender: senderLabel,
                            time: formattedTime,
                            caption: m.text,
                          })
                        }
                        className="relative group cursor-pointer mb-2 rounded-xl overflow-hidden bg-zinc-950 border border-cyan-500/20"
                      >
                        <img
                          src={m.imageUrl}
                          alt="Shared picture"
                          className="w-full max-h-72 object-cover transition-opacity group-hover:opacity-95"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-cyan-300 font-mono text-xs">
                          <Maximize2 className="w-4 h-4" />
                          <span>Open Full Picture</span>
                        </div>
                      </div>
                    )}

                    {/* Voice Message Attachment */}
                    {m.audioUrl && (
                      <div className={m.text ? 'mb-2' : ''}>
                        <VoiceMessagePlayer
                          audioUrl={m.audioUrl}
                          duration={m.audioDuration}
                          isMe={isMe}
                        />
                      </div>
                    )}

                    {/* Message Text */}
                    {m.text && (
                      <p className="whitespace-pre-wrap break-words text-[14px] sm:text-[15px] leading-relaxed">
                        {m.text}
                      </p>
                    )}

                    {/* Footer Row Inside Bubble: Timestamp + Delivery Ticks */}
                    <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-mono tabular-nums text-zinc-400">
                      <span>{formattedTime}</span>

                      {isMe && m.deliveryStatus === 'sending' && (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Sending</span>
                        </span>
                      )}

                      {isMe && m.deliveryStatus === 'sent' && (
                        <span className="inline-flex items-center gap-0.5 text-zinc-300">
                          <Check className="w-3.5 h-3.5" />
                          <span>Sent</span>
                        </span>
                      )}

                      {isMe && (!m.deliveryStatus || m.deliveryStatus === 'delivered') && (
                        <span className="inline-flex items-center gap-0.5 text-cyan-400">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </span>
                      )}

                      {isMe && isFailed && (
                        <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>

                    {/* Idempotent Retry Action */}
                    {isMe && isFailed && (
                      <div className="mt-2 pt-2 border-t border-rose-700/60 flex items-center justify-between gap-3 text-[11px] font-mono text-rose-200">
                        <span>{m.errorReason || 'Delivery interrupted'}</span>
                        <button
                          type="button"
                          onClick={() => handleRetryMessage(m)}
                          disabled={isSending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-lg cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Send Error Banner */}
      {sendError && (
        <div className="px-4 py-2 bg-rose-950/90 border-t border-rose-700/70 text-rose-100 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{sendError}</span>
          </div>
          {failedMessages.length > 0 && (
            <button
              type="button"
              onClick={() => handleRetryMessage(failedMessages[failedMessages.length - 1])}
              disabled={isSending}
              className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-md text-xs cursor-pointer shrink-0"
            >
              Retry Send
            </button>
          )}
        </div>
      )}

      {/* Pending Picture Attachment Preview Strip */}
      {pendingImagePreview && (
        <div className="px-4 py-2.5 bg-[#070C17] border-t border-cyan-500/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={pendingImagePreview}
              alt="Picture preview"
              className="w-12 h-12 object-cover rounded-xl border border-cyan-400/50 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {pendingImageName || 'Picture Ready'}
              </div>
              <div className="text-[11px] font-mono text-cyan-400">
                Add a caption below or tap SEND
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingImageFile(null);
              setPendingImagePreview(null);
              setPendingImageName(null);
            }}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer shrink-0"
            aria-label="Remove picture"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Voice Recording Preview Strip */}
      {recordedAudioUrl && !isRecording && (
        <div className="px-4 py-2.5 bg-[#070C17] border-t border-cyan-500/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <VoiceMessagePlayer
              audioUrl={recordedAudioUrl}
              duration={recordedDuration}
              isMe={true}
            />
          </div>
          <button
            type="button"
            onClick={discardVoiceRecording}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl cursor-pointer shrink-0"
            aria-label="Discard voice message"
            title="Discard Voice Recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Voice Recording Active Bar */}
      {isRecording && (
        <div className="px-4 py-3 bg-[#091224] border-t border-cyan-400/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono text-cyan-300 tabular-nums font-bold">
              Recording Voice · {formatDurationSec(recordingSeconds)} / 00:40
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={discardVoiceRecording}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold rounded-xl text-xs cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Large Bottom Composer Bar: Camera · Attachment · Voice · Large Textarea · SEND */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-[#05080F] border-t border-cyan-500/25 flex items-end gap-2 sm:gap-3 shrink-0"
      >
        {/* Hidden Inputs for File Attachment & Native Mobile Camera */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
        />
        <input
          type="file"
          ref={nativeCameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Media Actions Cluster */}
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {/* Camera Button */}
          <button
            type="button"
            onClick={handleOpenCamera}
            disabled={isPreparingImage || isSending || isRecording}
            className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-cyan-400/60 hover:text-cyan-300 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Take picture with camera"
            title="Camera"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Picture Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparingImage || isSending || isRecording}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
              pendingImagePreview
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-zinc-950 border-zinc-800 hover:border-cyan-400/60 hover:text-cyan-300 text-zinc-300'
            }`}
            aria-label="Attach picture"
            title="Upload Picture"
          >
            {isPreparingImage ? (
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Voice Recorder Button */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isSending || isPreparingImage}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
              isRecording
                ? 'bg-rose-600 border-rose-400 text-white'
                : recordedAudioUrl
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-zinc-950 border-zinc-800 hover:border-cyan-400/60 hover:text-cyan-300 text-zinc-300'
            }`}
            aria-label={isRecording ? 'Stop recording voice message' : 'Record voice message'}
            title={
              voiceSupported
                ? isRecording
                  ? 'Stop Recording'
                  : 'Record Voice Message'
                : 'Voice recording unavailable in this browser'
            }
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* Large Multi-Line Message Input Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            pendingImagePreview
              ? 'Add a caption for your picture...'
              : recordedAudioBlob
              ? 'Add an optional note with your voice message...'
              : 'Write your private message here...'
          }
          className="flex-1 min-h-[46px] max-h-[130px] px-4 py-3 bg-black border border-zinc-800 focus:border-cyan-400 rounded-xl text-white text-sm sm:text-[15px] leading-snug focus:outline-none placeholder:text-zinc-500 resize-none transition-colors"
        />

        {/* Prominent Cyan/Blue SEND Button */}
        <button
          type="submit"
          disabled={
            isSending ||
            isPreparingImage ||
            isRecording ||
            (!inputMessage.trim() && !pendingImagePreview && !recordedAudioBlob)
          }
          className="h-11 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 active:scale-[0.99] text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shrink-0 flex items-center gap-2 shadow-lg shadow-cyan-500/15"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">SENDING</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>SEND</span>
            </>
          )}
        </button>
      </form>

      {/* Webcam Viewfinder Overlay Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#070C17] border border-cyan-500/35 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Capture Picture</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-rose-300">
                  {cameraError}
                </div>
              )}
            </div>

            <div className="p-4 flex items-center justify-between gap-3 bg-[#05080F] border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraModalOpen(false);
                  nativeCameraInputRef.current?.click();
                }}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Use Device File / Camera
              </button>
              <button
                type="button"
                onClick={handleCaptureCameraPhoto}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-between p-4 sm:p-6"
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-extrabold text-cyan-300">{lightboxImage.sender}</span>
              <span className="text-zinc-500">·</span>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">{lightboxImage.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download={`chat_photo_${Date.now()}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/35 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                aria-label="Close picture preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 max-w-4xl max-h-[76vh] overflow-hidden my-auto">
            <img
              src={lightboxImage.url}
              alt="Full size attachment"
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {lightboxImage.caption && (
            <div className="w-full max-w-4xl text-center text-xs text-zinc-300 font-mono py-2 bg-zinc-950 rounded-xl border border-zinc-800 px-4 shrink-0">
              {lightboxImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
