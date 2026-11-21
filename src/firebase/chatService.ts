import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { Conversation, Message } from '../types';

export const VISITOR_PROFILE_KEY = 'elon_visitor_profile_v1';

export interface VisitorProfileMeta {
  visitorId?: string;
  visitorName?: string;
  conversationId?: string;
}

export function getLocalChatBackup(): VisitorProfileMeta {
  try {
    const raw = localStorage.getItem(VISITOR_PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function updateLocalChatBackup(patch: Partial<VisitorProfileMeta>): void {
  try {
    const current = getLocalChatBackup();
    const updated = { ...current, ...patch };
    localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to persist visitor profile preference:', err);
  }
}

/**
 * Ensures the visitor's unique persistent conversation thread exists in Firestore
 * with immediate direct messaging access (no admin approval gate).
 */
export async function ensureVisitorConversation(
  visitorId: string,
  visitorName: string
): Promise<string> {
  const conversationId = `conv_${visitorId}`;
  const convRef = doc(db, 'conversations', conversationId);
  try {
    const snap = await getDoc(convRef);
    const now = new Date().toISOString();
    if (!snap.exists()) {
      const initialConv: Conversation = {
        id: conversationId,
        visitorId,
        visitorName,
        status: 'active',
        isBlocked: false,
        submittedAt: now,
        lastMessageText: '',
        lastMessageTime: now,
        unreadAdminCount: 0,
        unreadVisitorCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(convRef, initialConv, { merge: true });
    }
    updateLocalChatBackup({ visitorId, visitorName, conversationId });
    return conversationId;
  } catch (error) {
    console.error('ensureVisitorConversation error:', error);
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

export function subscribeToVisitorConversation(
  conversationId: string,
  onUpdate: (conv: Conversation | null) => void,
  onError?: (err: Error) => void
) {
  const convRef = doc(db, 'conversations', conversationId);
  return onSnapshot(
    convRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = { ...snapshot.data(), id: snapshot.id } as Conversation;
        updateLocalChatBackup({
          visitorName: data.visitorName,
          conversationId: data.id,
        });
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Firestore visitor conversation listener error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToRealMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: Error) => void
) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(250));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        const raw = d.data() as Message;
        const isPendingWrite = d.metadata.hasPendingWrites;
        msgs.push({
          ...raw,
          id: d.id,
          deliveryStatus: isPendingWrite ? 'sent' : 'delivered',
        });
      });
      onUpdate(msgs);
    },
    (err) => {
      console.error('Firestore real-time messages listener error:', err);
      if (onError) onError(err);
    }
  );
}

export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface SendDirectMessageOptions {
  conversationId: string;
  from: 'visitor' | 'recipient';
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  imageCaption?: string;
  audioUrl?: string;
  audioDuration?: number;
  existingMessageId?: string;
}

/**
 * Send a persistent real-time message (text, picture, and/or voice note).
 * Idempotent on existingMessageId so retries never duplicate messages.
 */
export async function sendDirectPrivateMessage(
  opts: SendDirectMessageOptions
): Promise<Message> {
  const {
    conversationId,
    from,
    senderId,
    senderName,
    text,
    imageUrl,
    imageCaption,
    audioUrl,
    audioDuration,
    existingMessageId,
  } = opts;

  const messageId = existingMessageId || createMessageId();
  const now = new Date().toISOString();
  const trimmedText = text.trim();

  const messageType: 'text' | 'image' | 'voice' = audioUrl
    ? 'voice'
    : imageUrl
    ? 'image'
    : 'text';

  const summaryText =
    trimmedText ||
    (audioUrl
      ? `Voice message (${Math.max(1, Math.round(audioDuration || 0))}s)`
      : imageUrl
      ? 'Photo attachment'
      : '');

  const newMsg: Message = {
    id: messageId,
    conversationId,
    from,
    senderId,
    senderName,
    text: trimmedText,
    messageType,
    time: now,
    real: true,
    createdAt: now,
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageCaption ? { imageCaption } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    ...(typeof audioDuration === 'number' ? { audioDuration } : {}),
  };

  try {
    const convRef = doc(db, 'conversations', conversationId);
    const visitorIdFromConv = conversationId.startsWith('conv_')
      ? conversationId.slice(5)
      : senderId;

    const convPatch: Record<string, unknown> = {
      id: conversationId,
      visitorId: visitorIdFromConv,
      status: 'active',
      lastMessageText: summaryText,
      lastMessageTime: now,
      updatedAt: now,
    };

    if (from === 'visitor') {
      convPatch.visitorName = senderName;
      convPatch.unreadAdminCount = increment(1);
    } else {
      convPatch.unreadVisitorCount = increment(1);
    }

    await setDoc(convRef, convPatch, { merge: true });

    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(msgRef, newMsg, { merge: true });

    return {
      ...newMsg,
      deliveryStatus: 'sent',
    };
  } catch (error) {
    console.error('Firebase sendDirectPrivateMessage error:', error);
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

/**
 * Private real-time listener for all visitor threads (accessible strictly to authenticated recipient).
 */
export function subscribeToRecipientConversations(
  onUpdate: (convs: Conversation[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'conversations');
  const q = query(colRef, orderBy('updatedAt', 'desc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Conversation);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore recipient conversations listener error:', err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

export async function markMessagesAsRead(
  conversationId: string,
  role: 'visitor' | 'recipient'
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (role === 'recipient') {
      await setDoc(convRef, { unreadAdminCount: 0 }, { merge: true });
    } else {
      await setDoc(convRef, { unreadVisitorCount: 0 }, { merge: true });
    }
  } catch (err) {
    console.warn('Mark read notice:', err);
  }
}
