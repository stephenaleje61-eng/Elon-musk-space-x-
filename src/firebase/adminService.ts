import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { AdminAuditLog, ReportItem, UserProfile } from '../types';

/**
 * Log an administrator action to the immutable audit trail
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const newLog: AdminAuditLog = {
      id: logId,
      adminId,
      adminEmail,
      action,
      targetType,
      targetId,
      details: details || {},
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'adminAuditLogs', logId), newLog);
  } catch (error) {
    console.warn('Failed to record admin audit log:', error);
  }
}

/**
 * Listen to admin audit logs
 */
export function subscribeToAuditLogs(callback: (logs: AdminAuditLog[]) => void) {
  const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: AdminAuditLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ ...d.data(), id: d.id } as AdminAuditLog);
      });
      callback(logs);
    },
    (err) => {
      console.warn('Audit logs listener error:', err);
      callback([]);
    }
  );
}

/**
 * Listen to user reports
 */
export function subscribeToReports(callback: (reports: ReportItem[]) => void) {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ReportItem[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as ReportItem);
      });
      callback(list);
    },
    (err) => {
      console.warn('Reports listener notice:', err);
      callback([]);
    }
  );
}

/**
 * Resolve report
 */
export async function resolveReport(reportId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}

/**
 * Subscribe to all users in Firestore
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as UserProfile);
      });
      callback(list);
    },
    (err) => {
      console.warn('Users listener notice:', err);
      callback([]);
    }
  );
}

/**
 * Update user role (e.g., promote to admin or set user)
 */
export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      role,
      updatedAt: new Date().toISOString(),
    });
    if (role === 'admin') {
      await setDoc(doc(db, 'admins', userId), {
        id: userId,
        role: 'admin',
        addedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, 'admins', userId));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Delete a user profile from Firestore
 */
export async function deleteUserDoc(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
    await deleteDoc(doc(db, 'admins', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

/**
 * Grant admin privileges by UID
 */
export async function grantAdminByUid(uid: string, email?: string): Promise<void> {
  try {
    await setDoc(doc(db, 'admins', uid), {
      id: uid,
      email: email || '',
      role: 'admin',
      addedAt: new Date().toISOString(),
    }, { merge: true });
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      role: 'admin',
      email: email || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
  }
}

/**
 * Get registered & anonymous user count
 */
export async function getMarketplaceMetrics() {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    const convsSnap = await getDocs(collection(db, 'conversations'));
    const usersSnap = await getDocs(collection(db, 'users'));

    return {
      totalProducts: productsSnap.size,
      totalConversations: convsSnap.size,
      totalUsers: usersSnap.size,
    };
  } catch {
    return {
      totalProducts: 10,
      totalConversations: 0,
      totalUsers: 1,
    };
  }
}

