import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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

/**
 * Read visitor profile preference (display name & conversation id only — no fake/cached messages)
 */
export function getLocalChatBackup(): VisitorProfileMeta {
  try {
    const raw = localStorage.getItem(VISITOR_PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save visitor display profile preference
 */
export function updateLocalChatBackup(patch: Partial<VisitorProfileMeta>): void {
  try {
    const current = getLocalChatBackup();
    const updated = {
      ...current,
      ...patch,
    };
    localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to persist visitor profile preference:', err);
  }
}

/**
 * Submit a join request to Space Chat
 */
export async function submitJoinRequest(
  visitorId: string,
  name: string,
  location: string,
  message: string
): Promise<string> {
  const conversationId = `conv_${visitorId}`;
  const now = new Date().toISOString();

  const conversationData: Conversation = {
    id: conversationId,
    visitorId,
    visitorName: name.trim(),
    visitorLocation: location.trim(),
    initialMessage: message.trim(),
    status: 'pending',
    submittedAt: now,
    lastMessageText: message.trim(),
    lastMessageTime: now,
    unreadAdminCount: 1,
    unreadVisitorCount: 0,
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(convRef, conversationData, { merge: true });
    updateLocalChatBackup({
      visitorId,
      visitorName: name.trim(),
      conversationId,
    });
    return conversationId;
  } catch (error) {
    console.error('Firestore submitJoinRequest error:', error);
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

/**
 * Real-time listener for a visitor's conversation document
 */
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

/**
 * Real-time listener for messages in an active conversation (strictly Cloud Firestore onSnapshot)
 */
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

/**
 * Generate a stable client-side message ID so retries are idempotent and never create duplicates
 */
export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Send real human message with optional image attachment.
 * Idempotent when existingMessageId is provided so retries never create duplicate messages.
 */
export async function sendRealHumanMessage(
  conversationId: string,
  from: 'visitor' | 'admin',
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string,
  imageCaption?: string,
  existingMessageId?: string
): Promise<Message> {
  const messageId = existingMessageId || createMessageId();
  const now = new Date().toISOString();

  const trimmedText = text.trim();
  const summaryText = trimmedText || (imageUrl ? 'Photo attachment' : '');

  const newMsg: Message = {
    id: messageId,
    conversationId,
    from,
    senderId,
    senderName,
    text: trimmedText,
    time: now,
    real: true,
    createdAt: now,
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageCaption ? { imageCaption } : {}),
  };

  try {
    const convRef = doc(db, 'conversations', conversationId);
    const visitorIdFromConv = conversationId.startsWith('conv_')
      ? conversationId.slice(5)
      : senderId;

    // Enforce blocking constraint for visitor messages if doc already exists
    if (from === 'visitor') {
      const convSnap = await getDoc(convRef);
      if (convSnap.exists() && convSnap.data()?.isBlocked === true) {
        throw new Error('This conversation has been blocked by the platform administrator.');
      }
    }

    // 1. Ensure parent conversation document exists / update metadata safely with merge
    const convPatch: Record<string, unknown> = {
      id: conversationId,
      visitorId: visitorIdFromConv,
      status: 'accepted',
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

    // 2. Write message document idempotently using exact messageId (prevents duplicates on retry)
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(msgRef, newMsg, { merge: true });

    return {
      ...newMsg,
      deliveryStatus: 'sent',
    };
  } catch (error) {
    console.error('Firebase sendRealHumanMessage error:', error);
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversationId}/messages/${messageId}`
    );
  }
}

/**
 * Real-time listener for ALL conversations (Administrator Interface)
 */
export function subscribeToAllAdminConversations(
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
      console.error('Firestore admin conversations listener error:', err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/**
 * Administrator: Accept join request and unlock chat
 */
export async function acceptJoinRequest(
  conversationId: string,
  adminId: string,
  initialVisitorMessage?: string,
  visitorName?: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convRef,
      {
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    if (initialVisitorMessage && initialVisitorMessage.trim()) {
      const convSnap = await getDoc(convRef);
      const visitorId = convSnap.exists() ? convSnap.data().visitorId : '';
      const messageId = `msg_${Date.now()}_init`;
      const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const firstMsg: Message = {
        id: messageId,
        conversationId,
        from: 'visitor',
        senderId: visitorId || 'visitor',
        senderName: visitorName || 'Visitor',
        text: initialVisitorMessage.trim(),
        time: now,
        real: true,
        createdAt: now,
      };
      await setDoc(msgRef, firstMsg, { merge: true });
    }
  } catch (error) {
    console.error('Firestore acceptJoinRequest error:', error);
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

/**
 * Administrator: Decline join request
 */
export async function declineJoinRequest(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      status: 'declined',
      declinedAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Firestore declineJoinRequest error:', error);
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

/**
 * Export all conversations & messages as JSON backup
 */
export async function exportAllChatsJson(): Promise<string> {
  try {
    const convsSnap = await getDocs(collection(db, 'conversations'));
    const dump: Array<{ conversation: Conversation; messages: Message[] }> = [];

    for (const convDoc of convsSnap.docs) {
      const conv = { ...convDoc.data(), id: convDoc.id } as Conversation;
      const msgsSnap = await getDocs(
        collection(db, 'conversations', conv.id, 'messages')
      );
      const msgs: Message[] = [];
      msgsSnap.forEach((m) => msgs.push({ ...m.data(), id: m.id } as Message));
      dump.push({ conversation: conv, messages: msgs });
    }

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 'elon_real_human_chat_v2',
        totalConversations: dump.length,
        data: dump,
      },
      null,
      2
    );
  } catch (error) {
    console.error('Failed to export all chats:', error);
    throw error;
  }
}

// Compatibility exports for existing administration dashboard
export const subscribeToAllConversations = subscribeToAllAdminConversations;
export const subscribeToMessages = subscribeToRealMessages;

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderRole: 'visitor' | 'admin',
  senderName: string,
  text: string,
  imageUrl?: string,
  existingMessageId?: string
): Promise<Message> {
  return sendRealHumanMessage(
    conversationId,
    senderRole,
    senderId,
    senderName,
    text,
    imageUrl,
    undefined,
    existingMessageId
  );
}

export async function markMessagesAsRead(
  conversationId: string,
  role: 'visitor' | 'admin'
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (role === 'admin') {
      await setDoc(convRef, { unreadAdminCount: 0 }, { merge: true });
    } else {
      await setDoc(convRef, { unreadVisitorCount: 0 }, { merge: true });
    }
  } catch (err) {
    console.warn('Mark read warning:', err);
  }
}

export async function toggleBlockConversation(
  conversationId: string,
  isBlocked: boolean
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(convRef, { isBlocked, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Block conversation error:', err);
    throw err;
  }
}
