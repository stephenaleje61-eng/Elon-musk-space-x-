export type SectionId =
  | 'tesla'
  | 'robotics'
  | 'spacex'
  | 'starlink'
  | 'xai'
  | 'neuralink'
  | 'boring'
  | 'x'
  | 'investment';

export interface SectionMeta {
  id: SectionId;
  number: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  heroImage: string;
  categories: string[];
}

export interface Product {
  id: string;
  title: string;
  subtitle: string;
  sectionId: SectionId;
  category: string;
  price: number;
  specs: Record<string, string>;
  images: string[];
  description: string;
  isFeatured: boolean;
  inStock: boolean;
  inventoryCount: number;
  deliveryEstimate?: string;
  badge?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  sectionId: SectionId;
  category: string;
  author: string;
  readTime: string;
  coverImage: string;
  content: string;
  tags: string[];
  isFeatured: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  sectionId: SectionId;
  name: string;
  slug: string;
  description?: string;
  itemCount: number;
}

export interface Conversation {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorLocation?: string;
  initialMessage?: string;
  status: 'pending' | 'accepted' | 'declined';
  submittedAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageTimestamp?: string;
  unreadAdminCount: number;
  unreadVisitorCount: number;
  isReported?: boolean;
  isBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  from: 'visitor' | 'admin';
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  imageCaption?: string;
  time: string;
  real: true;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt?: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'product' | 'article';
  title: string;
  image: string;
  price?: number;
  sectionId: SectionId;
  createdAt: string;
}

export interface InvestmentWatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  targetPrice?: number;
  notes?: string;
  addedAt: string;
}

export interface ReportItem {
  id: string;
  conversationId: string;
  messageId?: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type VerificationStatus = 'unverified' | 'pending_audit' | 'verified' | 'rejected';

export interface VerificationRecord {
  id: string; // 'current_status'
  status: VerificationStatus;
  isVerified: boolean;
  legalOwnerName: string;
  operatingCompanyName: string;
  companyRegistrationNumber?: string;
  jurisdiction?: string;
  officialContactEmail: string;
  officialSupportPhone?: string;
  registeredAddress?: string;
  verificationProvider?: string;
  verificationDate?: string;
  verificationSourceUrl?: string;
  certificateId?: string;
  documentAuditNotes?: string;
  disclaimer: string;
  updatedAt: string;
  updatedBy: string;
}

