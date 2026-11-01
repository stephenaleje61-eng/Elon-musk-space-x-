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
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { Conversation, Message } from '../types';

export const LOCAL_STORAGE_KEY = 'elon_real_human_chat_v1';

export interface LocalChatBackup {
  visitorId?: string;
  visitorName?: string;
  visitorLocation?: string;
  initialMessage?: string;
  status?: 'pending' | 'accepted' | 'declined';
  submittedAt?: string;
  conversationId?: string;
  messages?: Message[];
  updatedAt?: string;
}

/**
 * Read the local recovery backup
 */
export function getLocalChatBackup(): LocalChatBackup {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save data to local recovery backup
 */
export function updateLocalChatBackup(patch: Partial<LocalChatBackup>): void {
  try {
    const current = getLocalChatBackup();
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to update localStorage backup:', err);
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
    createdAt: now,
    updatedAt: now,
  };

  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(convRef, conversationData, { merge: true });

    // Store local recovery backup
    updateLocalChatBackup({
      visitorId,
      visitorName: name.trim(),
      visitorLocation: location.trim(),
      initialMessage: message.trim(),
      status: 'pending',
      submittedAt: now,
      conversationId,
    });

    return conversationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

/**
 * Real-time listener for a visitor's conversation state
 */
export function subscribeToVisitorConversation(
  conversationId: string,
  onUpdate: (conv: Conversation | null) => void
) {
  const convRef = doc(db, 'conversations', conversationId);
  return onSnapshot(
    convRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = { ...snapshot.data(), id: snapshot.id } as Conversation;
        // Synchronize local backup
        updateLocalChatBackup({
          status: data.status,
          visitorName: data.visitorName,
          visitorLocation: data.visitorLocation,
          conversationId: data.id,
        });
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Visitor conversation listener error:', err);
      // Fallback to local backup if offline
      const local = getLocalChatBackup();
      if (local.conversationId === conversationId && local.status) {
        onUpdate({
          id: conversationId,
          visitorId: local.visitorId || '',
          visitorName: local.visitorName || '',
          visitorLocation: local.visitorLocation || '',
          initialMessage: local.initialMessage || '',
          status: local.status,
          submittedAt: local.submittedAt || '',
          lastMessageText: '',
          lastMessageTime: '',
          unreadAdminCount: 0,
          unreadVisitorCount: 0,
          createdAt: local.submittedAt || '',
          updatedAt: local.updatedAt || '',
        });
      } else {
        onUpdate(null);
      }
    }
  );
}

/**
 * Real-time listener for messages in an active conversation
 */
export function subscribeToRealMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void
) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(250));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ ...d.data(), id: d.id } as Message);
      });
      // Update local storage backup
      updateLocalChatBackup({ messages: msgs });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Real messages listener error:', err);
      const local = getLocalChatBackup();
      if (local.messages && local.messages.length > 0) {
        onUpdate(local.messages);
      } else {
        onUpdate([]);
      }
    }
  );
}

/**
 * Send real human message with optional image attachment
 */
export async function sendRealHumanMessage(
  conversationId: string,
  from: 'visitor' | 'admin',
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string,
  imageCaption?: string
): Promise<Message> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const trimmedText = text.trim();
  const summaryText = trimmedText || (imageUrl ? '📷 Photo' : '');

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

    // Enforce blocking constraint: Blocked visitors cannot post new messages
    if (from === 'visitor') {
      const convSnap = await getDoc(convRef);
      if (convSnap.exists() && convSnap.data()?.isBlocked) {
        throw new Error('This conversation has been blocked by the platform administrator.');
      }
    }

    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(msgRef, newMsg);

    // Update conversation record
    const updateData: Partial<Conversation> = {
      lastMessageText: summaryText,
      lastMessageTime: now,
      updatedAt: now,
    };
    if (from === 'visitor') {
      updateData.unreadAdminCount = 1;
    } else {
      updateData.unreadVisitorCount = 1;
    }

    await updateDoc(convRef, updateData);

    // Save to local backup
    const local = getLocalChatBackup();
    const existingMsgs = local.messages || [];
    updateLocalChatBackup({ messages: [...existingMsgs, newMsg] });

    return newMsg;
  } catch (error) {
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
  onUpdate: (convs: Conversation[]) => void
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
      console.warn('Admin conversations listener error:', err);
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
    await updateDoc(convRef, {
      status: 'accepted',
      acceptedAt: now,
      updatedAt: now,
    });

    // If visitor submitted an initial message with the join request, record it as first message
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
      await setDoc(msgRef, firstMsg);
    }
  } catch (error) {
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
        version: 'elon_real_human_chat_v1',
        totalConversations: dump.length,
        data: dump,
      },
      null,
      2
    );
  } catch (error) {
    console.error('Failed to export all chats:', error);
    // Fallback to local storage
    const local = getLocalChatBackup();
    return JSON.stringify({ exportedAt: new Date().toISOString(), localBackup: local }, null, 2);
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
  imageUrl?: string
): Promise<Message> {
  return sendRealHumanMessage(
    conversationId,
    senderRole,
    senderId,
    senderName,
    text,
    imageUrl
  );
}

export async function markMessagesAsRead(
  conversationId: string,
  role: 'visitor' | 'admin'
): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    if (role === 'admin') {
      await updateDoc(convRef, { unreadAdminCount: 0 });
    } else {
      await updateDoc(convRef, { unreadVisitorCount: 0 });
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
    await updateDoc(convRef, { isBlocked, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Block conversation warning:', err);
  }
}
