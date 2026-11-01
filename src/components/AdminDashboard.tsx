import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Ban,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  Layers,
  Flag,
  Activity,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  UploadCloud,
  Send,
  Eye,
  LogOut,
  RefreshCw,
  Users,
  UserCheck,
  Search,
  Filter,
  Building2,
  ExternalLink,
  Lock,
  Scale,
} from 'lucide-react';
import { SECTIONS } from '../data/sections';
import {
  Product,
  Article,
  Conversation,
  Message,
  ReportItem,
  AdminAuditLog,
  SectionId,
  UserProfile,
  VerificationRecord,
  VerificationStatus,
} from '../types';
import {
  saveProduct,
  deleteProduct,
  saveArticle,
  deleteArticle,
  subscribeToVerificationRecord,
  saveVerificationRecord,
  DEFAULT_VERIFICATION_RECORD,
} from '../firebase/database';
import { VerificationBadge } from './VerificationBadge';
import { uploadImage, compressImageFile } from '../firebase/storage';
import {
  subscribeToAllConversations,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  toggleBlockConversation,
} from '../firebase/chatService';
import {
  logAdminAction,
  subscribeToAuditLogs,
  subscribeToReports,
  resolveReport,
  getMarketplaceMetrics,
  subscribeToUsers,
  updateUserRole,
  deleteUserDoc,
} from '../firebase/adminService';

interface AdminDashboardProps {
  products: Product[];
  articles: Article[];
  adminEmail: string;
  adminId: string;
  onLogout: () => void;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  articles,
  adminEmail,
  adminId,
  onLogout,
  onBackToStore,
}) => {
  const [activeTab, setActiveTab] = useState<
    'products' | 'new-product' | 'articles' | 'new-article' | 'inbox' | 'users' | 'reports' | 'audit' | 'verification'
  >('products');

  // Ownership & Authenticity Verification State
  const [verificationRecord, setVerificationRecord] = useState<VerificationRecord>(DEFAULT_VERIFICATION_RECORD);
  const [vStatus, setVStatus] = useState<VerificationStatus>('pending_audit');
  const [vIsVerified, setVIsVerified] = useState(false);
  const [vOwnerName, setVOwnerName] = useState('Stephen Sirrod');
  const [vCompany, setVCompany] = useState('Independent Platform Administration & Media');
  const [vRegNumber, setVRegNumber] = useState('REG-PENDING-AUDIT-2026');
  const [vJurisdiction, setVJurisdiction] = useState('United States & Global Cloud Operations');
  const [vEmail, setVEmail] = useState(adminEmail || 'sirrodstephen@gmail.com');
  const [vPhone, setVPhone] = useState('+1 (800) 555-0199');
  const [vAddress, setVAddress] = useState('Independent Administrative Command, Austin, TX & Global Cloud Network');
  const [vProvider, setVProvider] = useState('Independent Third-Party Verification Authority');
  const [vDate, setVDate] = useState('2026-11-01');
  const [vSourceUrl, setVSourceUrl] = useState('https://ais-pre-jw6kwu57it3to7ymgbrghg-568307259341.europe-west3.run.app');
  const [vCertId, setVCertId] = useState('AUTH-VERIF-DOC-PENDING');
  const [vNotes, setVNotes] = useState('Authentic legal identity documentation submitted and currently undergoing independent third-party audit. Blue verification badge will illuminate upon final validation.');
  const [vDisclaimer, setVDisclaimer] = useState('ELON MUSK SPACE is an independent technology catalog, space commerce directory, and market intelligence platform. This platform is NOT owned, operated, authorized, or endorsed by Elon Musk, Tesla, Inc., SpaceX, or their affiliates.');
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [verificationSaveNotice, setVerificationSaveNotice] = useState<string | null>(null);

  // Product Creator Form State
  const [pTitle, setPTitle] = useState('');
  const [pSubtitle, setPSubtitle] = useState('');
  const [pSection, setPSection] = useState<SectionId>('tesla');
  const [pCategory, setPCategory] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pStock, setPStock] = useState(true);
  const [pCount, setPCount] = useState('10');
  const [pFeatured, setPFeatured] = useState(false);
  const [pSpecs, setPSpecs] = useState<{ key: string; value: string }[]>([
    { key: 'Classification', value: 'Commercial Grade' },
    { key: 'Warranty', value: 'Included' },
  ]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // Article Creator State
  const [aTitle, setATitle] = useState('');
  const [aSubtitle, setASubtitle] = useState('');
  const [aSection, setASection] = useState<SectionId>('spacex');
  const [aCategory, setACategory] = useState('Research & Flight Telemetry');
  const [aAuthor, setAAuthor] = useState('Platform Research Division');
  const [aReadTime, setAReadTime] = useState('5 min read');
  const [aContent, setAContent] = useState('');
  const [aTags, setATags] = useState('SpaceX, Starship, Propulsion');
  const [aCoverUrl, setACoverUrl] = useState('');
  const articleFileInputRef = useRef<HTMLInputElement>(null);

  // Inbox & Messaging State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyImage, setAdminReplyImage] = useState<string | null>(null);
  const [adminReplyImageName, setAdminReplyImageName] = useState<string | null>(null);
  const [isAdminCompressingImage, setIsAdminCompressingImage] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [adminPreviewLightbox, setAdminPreviewLightbox] = useState<string | null>(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'blocked'>('all');
  const [mobileChatView, setMobileChatView] = useState(false);
  const [blockConfirmDialog, setBlockConfirmDialog] = useState<{
    isOpen: boolean;
    conversation: Conversation;
    action: 'block' | 'unblock';
  } | null>(null);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const adminChatEndRef = useRef<HTMLDivElement>(null);
  const adminChatFileInputRef = useRef<HTMLInputElement>(null);

  // Reports & Audits
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ totalProducts: 0, totalConversations: 0, totalUsers: 0 });

  // Load metrics & live subscriptions
  useEffect(() => {
    getMarketplaceMetrics().then(setMetrics);
    const unsubConversations = subscribeToAllConversations((convs) => {
      setConversations(convs);
    });
    const unsubReports = subscribeToReports((reps) => {
      setReports(reps);
    });
    const unsubAudit = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });
    const unsubUsers = subscribeToUsers((u) => {
      setUsersList(u);
    });
    const unsubVerif = subscribeToVerificationRecord((rec) => {
      setVerificationRecord(rec);
      setVStatus(rec.status);
      setVIsVerified(rec.isVerified);
      setVOwnerName(rec.legalOwnerName || '');
      setVCompany(rec.operatingCompanyName || '');
      setVRegNumber(rec.companyRegistrationNumber || '');
      setVJurisdiction(rec.jurisdiction || '');
      setVEmail(rec.officialContactEmail || adminEmail);
      setVPhone(rec.officialSupportPhone || '');
      setVAddress(rec.registeredAddress || '');
      setVProvider(rec.verificationProvider || '');
      setVDate(rec.verificationDate || '');
      setVSourceUrl(rec.verificationSourceUrl || '');
      setVCertId(rec.certificateId || '');
      setVNotes(rec.documentAuditNotes || '');
      setVDisclaimer(rec.disclaimer || '');
    });

    return () => {
      unsubConversations();
      unsubReports();
      unsubAudit();
      unsubUsers();
      unsubVerif();
    };
  }, []);

  // Save/Update Ownership Verification Record
  const handleSaveVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVerification(true);
    setVerificationSaveNotice(null);

    try {
      const recordToSave: Partial<VerificationRecord> = {
        status: vStatus,
        isVerified: vStatus === 'verified' && vIsVerified,
        legalOwnerName: vOwnerName.trim(),
        operatingCompanyName: vCompany.trim(),
        companyRegistrationNumber: vRegNumber.trim(),
        jurisdiction: vJurisdiction.trim(),
        officialContactEmail: vEmail.trim(),
        officialSupportPhone: vPhone.trim(),
        registeredAddress: vAddress.trim(),
        verificationProvider: vProvider.trim(),
        verificationDate: vDate.trim(),
        verificationSourceUrl: vSourceUrl.trim(),
        certificateId: vCertId.trim(),
        documentAuditNotes: vNotes.trim(),
        disclaimer: vDisclaimer.trim(),
      };
      await saveVerificationRecord(recordToSave, adminId, adminEmail);
      setVerificationSaveNotice('Verification record successfully saved to Firestore.');
      setTimeout(() => setVerificationSaveNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update verification record:', err);
      setVerificationSaveNotice('Failed to update verification record in Firestore.');
    } finally {
      setIsSavingVerification(false);
    }
  };

  // Subscribe to active conversation messages
  useEffect(() => {
    if (!activeConversation) return;
    markMessagesAsRead(activeConversation.id, 'admin');
    const unsub = subscribeToMessages(activeConversation.id, (msgs) => {
      setChatMessages(msgs);
    });
    return () => unsub();
  }, [activeConversation]);

  // Handle uploading product images
  const handleProductImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadProgress(10);
    setUploadStatus('Uploading images to Firebase Storage...');
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadImage(file, 'products', (prog) => {
          setUploadProgress(prog);
        });
        newUrls.push(url);
      }
      setUploadedImageUrls((prev) => [...prev, ...newUrls]);
      setUploadStatus(`Uploaded ${newUrls.length} image(s) successfully`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadStatus('Failed to upload image. Please try again.');
    } finally {
      setUploadProgress(null);
    }
  };

  // Publish product to Firestore
  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle.trim() || !pPrice) {
      setPublishError('Please enter a valid product title and price.');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    const priceNum = parseFloat(pPrice);
    const countNum = parseInt(pCount, 10) || 1;
    const finalImages =
      uploadedImageUrls.length > 0
        ? uploadedImageUrls
        : ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600'];

    const specsObj: Record<string, string> = {};
    pSpecs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });

    const newProdId = `prod_${Date.now()}`;
    const newProduct: Product = {
      id: newProdId,
      title: pTitle.trim(),
      subtitle: pSubtitle.trim(),
      sectionId: pSection,
      category: pCategory.trim() || 'General Hardware',
      price: priceNum,
      specs: specsObj,
      images: finalImages,
      description: pDesc.trim() || 'Official technology specification.',
      isFeatured: pFeatured,
      inStock: pStock,
      inventoryCount: countNum,
      createdAt: new Date().toISOString(),
      createdBy: adminEmail,
    };

    try {
      await saveProduct(newProduct);
      await logAdminAction(adminId, adminEmail, 'CREATE_PRODUCT', 'Product', newProdId, {
        title: newProduct.title,
        price: newProduct.price,
      });

      setPublishSuccess(true);
      // Reset form
      setPTitle('');
      setPSubtitle('');
      setPPrice('');
      setPDesc('');
      setUploadedImageUrls([]);
      setTimeout(() => {
        setPublishSuccess(false);
        setActiveTab('products');
      }, 1500);
    } catch (err) {
      console.error('Publishing failed:', err);
      setPublishError('Failed to publish product to Firestore. Check permissions.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      await deleteProduct(id);
      await logAdminAction(adminId, adminEmail, 'DELETE_PRODUCT', 'Product', id, { title });
    } catch (err) {
      alert('Delete failed. See console.');
    }
  };

  // Publish Article
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim() || !aContent.trim()) return;

    const newArtId = `art_${Date.now()}`;
    const newArticle: Article = {
      id: newArtId,
      title: aTitle.trim(),
      subtitle: aSubtitle.trim(),
      sectionId: aSection,
      category: aCategory.trim(),
      author: aAuthor.trim() || 'Platform Administration',
      readTime: aReadTime.trim() || '4 min read',
      coverImage: aCoverUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
      content: aContent.trim(),
      tags: aTags.split(',').map((t) => t.trim()).filter(Boolean),
      isFeatured: true,
      publishedAt: 'October 2026',
      createdAt: new Date().toISOString(),
    };

    try {
      await saveArticle(newArticle);
      await logAdminAction(adminId, adminEmail, 'CREATE_ARTICLE', 'Article', newArtId, {
        title: newArticle.title,
      });
      setATitle('');
      setASubtitle('');
      setAContent('');
      setActiveTab('articles');
    } catch (err) {
      console.error('Article publish error:', err);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Permanently remove article: "${title}"?`)) return;
    try {
      await deleteArticle(id);
      await logAdminAction(adminId, adminEmail, 'DELETE_ARTICLE', 'Article', id, { title });
    } catch (err) {
      alert('Failed to delete article.');
    }
  };

  // Select image for admin chat reply
  const handleAdminImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setIsAdminCompressingImage(true);
    try {
      const compressed = await compressImageFile(file, 1200, 0.82);
      setAdminReplyImage(compressed);
      setAdminReplyImageName(file.name);
    } catch (err) {
      console.error('Admin image selection error:', err);
    } finally {
      setIsAdminCompressingImage(false);
      e.target.value = '';
    }
  };

  // Send admin reply in chat
  const handleSendAdminReply = async () => {
    if ((!adminReplyText.trim() && !adminReplyImage) || !activeConversation || replySending) return;
    setReplySending(true);
    const text = adminReplyText.trim();
    const imageToSend = adminReplyImage;
    setAdminReplyText('');
    setAdminReplyImage(null);
    setAdminReplyImageName(null);
    try {
      await sendMessage(
        activeConversation.id,
        adminId,
        'admin',
        'Platform Administrator',
        text,
        imageToSend || undefined
      );
    } catch (err) {
      console.error('Reply failed:', err);
      setAdminReplyText(text);
      if (imageToSend) setAdminReplyImage(imageToSend);
    } finally {
      setReplySending(false);
    }
  };

  // Auto-scroll to latest message in admin chat
  useEffect(() => {
    adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeConversation]);

  // Handle blocking and unblocking visitor with Firestore persistence and audit logging
  const handleConfirmBlockToggle = async () => {
    if (!blockConfirmDialog) return;
    const { conversation, action } = blockConfirmDialog;
    const shouldBlock = action === 'block';
    setBlockActionLoading(true);
    try {
      await toggleBlockConversation(conversation.id, shouldBlock);
      await logAdminAction(
        adminId,
        adminEmail,
        shouldBlock ? 'BLOCK_VISITOR' : 'UNBLOCK_VISITOR',
        'Conversation',
        conversation.id,
        { visitorName: conversation.visitorName, visitorId: conversation.visitorId }
      );
      // Immediately reflect in active conversation and list
      setActiveConversation((prev) => (prev && prev.id === conversation.id ? { ...prev, isBlocked: shouldBlock } : prev));
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, isBlocked: shouldBlock } : c))
      );
      setBlockConfirmDialog(null);
    } catch (err) {
      console.error('Failed to update visitor block status:', err);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // Handle role toggle (promote to admin or demote to user)
  const handleToggleUserRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setUserActionLoading(targetUser.id);
    try {
      await updateUserRole(targetUser.id, newRole);
      await logAdminAction(adminId, adminEmail, 'UPDATE_USER_ROLE', 'User', targetUser.id, {
        previousRole: targetUser.role,
        newRole,
        targetEmail: targetUser.email,
      });
    } catch (err) {
      console.error('Failed to update user role:', err);
    } finally {
      setUserActionLoading(null);
    }
  };

  // Handle delete user profile
  const handleDeleteUser = async (targetUser: UserProfile) => {
    setUserActionLoading(targetUser.id);
    try {
      await deleteUserDoc(targetUser.id);
      await logAdminAction(adminId, adminEmail, 'DELETE_USER', 'User', targetUser.id, {
        email: targetUser.email,
      });
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setUserActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      {/* Admin Top Navigation */}
      <header className="bg-zinc-950 text-white border-b border-zinc-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
            ADMIN
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
              <span>ELON MUSK SPACE</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded">
                AUTHORIZED CONSOLE
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Signed in as: <strong className="text-zinc-200">{adminEmail}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStore}
            className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Preview Marketplace
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800 rounded-lg hover:bg-rose-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <div className={`flex-1 w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 ${activeTab === 'inbox' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        {/* Left Sidebar Menu */}
        <aside className="w-full lg:w-64 bg-white rounded-xl border border-zinc-200 p-4 shrink-0 shadow-xs h-fit space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-2">
            Catalog & Posting
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'products' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>Products Catalog</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{products.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('new-product')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'new-product' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Post New Product</span>
          </button>

          <button
            onClick={() => setActiveTab('articles')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'articles' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Technical Articles</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{articles.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('new-article')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'new-article' ? 'bg-blue-600 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Publish Article</span>
          </button>

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-2">
            Visitors & Messaging
          </div>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'inbox' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span>Visitor Conversations</span>
            </span>
            {conversations.filter((c) => (c.unreadAdminCount ?? 0) > 0).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                {conversations.filter((c) => (c.unreadAdminCount ?? 0) > 0).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'users' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-500" />
              <span>User Accounts & Roles</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{usersList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Flag className="w-4 h-4 text-rose-500" />
              <span>Moderation Reports</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{reports.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'audit' ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Admin Audit Trail</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">{auditLogs.length}</span>
          </button>

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-2">
            Governance & Identity
          </div>

          <button
            onClick={() => setActiveTab('verification')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'verification' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'verification' ? 'text-white' : 'text-blue-600'}`} />
              <span>Ownership & Verification</span>
            </span>
            <VerificationBadge record={verificationRecord} size="sm" showDetailsTooltip={false} />
          </button>
        </aside>

        {/* Right Tab Content View */}
        <main className={`flex-1 overflow-hidden ${activeTab === 'inbox' ? 'bg-transparent border-0 p-0 shadow-none' : 'bg-white rounded-xl border border-zinc-200 p-6 shadow-xs'}`}>
          {/* TAB 1: ALL PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950">Marketplace Catalog Management</h2>
                  <p className="text-xs text-zinc-500">
                    Live Firestore catalog across all nine technology sectors.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('new-product')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">Section</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">Stock</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-zinc-900 max-w-xs truncate">
                          {p.title}
                        </td>
                        <td className="py-3 px-3 font-mono uppercase text-blue-600">{p.sectionId}</td>
                        <td className="py-3 px-3 text-zinc-600">{p.category}</td>
                        <td className="py-3 px-3 font-mono font-bold text-zinc-950 tabular-nums">
                          ${p.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {p.inStock ? (
                            <span className="text-emerald-700 font-semibold">In Stock ({p.inventoryCount})</span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Waitlist</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: POST NEW PRODUCT (POSTING SYSTEM) */}
          {activeTab === 'new-product' && (
            <div>
              <div className="pb-4 border-b border-zinc-200 mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Publish New Product</h2>
                <p className="text-xs text-zinc-500">
                  Upload multiple pictures to Firebase Storage, store permanent document in Firestore, and broadcast to the marketplace.
                </p>
              </div>

              {publishSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Product published successfully to Firestore!</span>
                </div>
              )}

              {publishError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{publishError}</span>
                </div>
              )}

              <form onSubmit={handlePublishProduct} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      placeholder="e.g. Tesla Cybertruck — Cyberbeast"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                      Subtitle / One-Line Descriptor
                    </label>
                    <input
                      type="text"
                      value={pSubtitle}
                      onChange={(e) => setPSubtitle(e.target.value)}
                      placeholder="e.g. Tri-Motor AWD with Steer-by-Wire"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                      Target Section (1–9) *
                    </label>
                    <select
                      value={pSection}
                      onChange={(e) => setPSection(e.target.value as SectionId)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {SECTIONS.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.number}. {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                      Category Tag *
                    </label>
                    <input
                      type="text"
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      placeholder="e.g. Cybertruck, Optimus, Starship"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                      Price (USD) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      placeholder="99990"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Multiple Pictures Upload Section */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                    Upload Pictures (Firebase Storage)
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 hover:border-blue-500 rounded-xl p-6 text-center bg-zinc-50/50 transition-colors">
                    <input
                      type="file"
                      ref={productFileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleProductImageFiles}
                      className="hidden"
                    />
                    <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <div className="text-xs text-zinc-600 mb-3">
                      Select multiple image files from your computer or camera.
                    </div>
                    <button
                      type="button"
                      onClick={() => productFileInputRef.current?.click()}
                      className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Browse Images
                    </button>

                    {uploadStatus && (
                      <div className="text-xs text-blue-600 font-semibold mt-3">{uploadStatus}</div>
                    )}
                    {uploadProgress !== null && (
                      <div className="mt-3 max-w-xs mx-auto bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}

                    {uploadedImageUrls.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {uploadedImageUrls.map((url, i) => (
                          <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 relative group">
                            <img
                              src={url}
                              alt="Uploaded"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setUploadedImageUrls((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="absolute top-1 right-1 p-0.5 bg-zinc-950/80 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
                    Full Description
                  </label>
                  <textarea
                    rows={4}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Engineering description, structural materials, battery architecture..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* Key Technical Specifications */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                      Technical Specifications
                    </label>
                    <button
                      type="button"
                      onClick={() => setPSpecs([...pSpecs, { key: '', value: '' }])}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {pSpecs.map((spec, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Feature (e.g. 0-60 mph)"
                          value={spec.key}
                          onChange={(e) => {
                            const updated = [...pSpecs];
                            updated[index].key = e.target.value;
                            setPSpecs(updated);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Specification (e.g. 2.6 seconds)"
                          value={spec.value}
                          onChange={(e) => {
                            const updated = [...pSpecs];
                            updated[index].value = e.target.value;
                            setPSpecs(updated);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setPSpecs(pSpecs.filter((_, idx) => idx !== index))}
                          className="p-1.5 text-zinc-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pStock}
                      onChange={(e) => setPStock(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Available in Stock</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pFeatured}
                      onChange={(e) => setPFeatured(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Feature on Marketplace Homepage</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isPublishing ? 'Publishing to Firestore...' : 'Publish Product to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ARTICLES */}
          {activeTab === 'articles' && (
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950">Technical Articles & Publications</h2>
                  <p className="text-xs text-zinc-500">
                    Propulsion engineering papers, robotics updates, and Starlink telemetry papers.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('new-article')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Article</span>
                </button>
              </div>

              <div className="space-y-4">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 rounded-xl border border-zinc-200 flex items-start justify-between gap-4 hover:border-zinc-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 font-mono">
                        <span className="text-blue-600 font-bold uppercase">{art.sectionId}</span>
                        <span>·</span>
                        <span>{art.category}</span>
                        <span>·</span>
                        <span>{art.readTime}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-1">{art.title}</h4>
                      <p className="text-xs text-zinc-600 line-clamp-2">{art.subtitle}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteArticle(art.id, art.title)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Delete article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PUBLISH ARTICLE */}
          {activeTab === 'new-article' && (
            <div>
              <div className="pb-4 border-b border-zinc-200 mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Publish Research Article</h2>
              </div>

              <form onSubmit={handlePublishArticle} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Article Title *</label>
                  <input
                    type="text"
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    placeholder="e.g. Starship Raptor 3 Combustion Chamber Physics"
                    className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Section</label>
                    <select
                      value={aSection}
                      onChange={(e) => setASection(e.target.value as SectionId)}
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Author Byline</label>
                    <input
                      type="text"
                      value={aAuthor}
                      onChange={(e) => setAAuthor(e.target.value)}
                      placeholder="e.g. SpaceX Propulsion Engineering"
                      className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Article Content *</label>
                  <textarea
                    rows={8}
                    value={aContent}
                    onChange={(e) => setAContent(e.target.value)}
                    placeholder="Write detailed scientific and technical publication body..."
                    className="w-full px-3.5 py-2 text-xs border border-zinc-300 rounded-xl"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('articles')}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 cursor-pointer"
                  >
                    Publish Article
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: VISITOR INBOX & REPLIES (SPACIOUS, RESPONSIVE & PROFESSIONAL) */}
          {activeTab === 'inbox' && (() => {
            const filteredConvs = conversations.filter((c) => {
              if (inboxFilter === 'unread' && (c.unreadAdminCount ?? 0) === 0) return false;
              if (inboxFilter === 'blocked' && !c.isBlocked) return false;
              if (!inboxSearch.trim()) return true;
              const term = inboxSearch.toLowerCase();
              return (
                (c.visitorName && c.visitorName.toLowerCase().includes(term)) ||
                (c.visitorId && c.visitorId.toLowerCase().includes(term)) ||
                (c.lastMessageText && c.lastMessageText.toLowerCase().includes(term))
              );
            });
            const unreadCount = conversations.filter((c) => (c.unreadAdminCount ?? 0) > 0).length;
            const blockedCount = conversations.filter((c) => c.isBlocked).length;

            return (
              <div className="h-[calc(100vh-175px)] min-h-[680px] sm:min-h-[750px] bg-white border border-zinc-200 rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-sm">
                {/* Left Conversation List (Full width on mobile when !mobileChatView, fixed width on md+) */}
                <div
                  className={`w-full md:w-80 lg:w-[380px] border-r border-zinc-200 flex flex-col shrink-0 bg-zinc-50/70 overflow-hidden ${
                    mobileChatView ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Header & Search */}
                  <div className="p-4 border-b border-zinc-200 bg-white space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-zinc-950 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span>Visitor Inquiries</span>
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {conversations.length} total visitor threads
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white animate-pulse">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search visitor name, ID, or text..."
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-2 text-xs bg-zinc-100 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-zinc-400"
                      />
                      {inboxSearch && (
                        <button
                          type="button"
                          onClick={() => setInboxSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-zinc-100 p-1 rounded-lg gap-1 text-[11px] font-semibold text-zinc-600">
                      <button
                        type="button"
                        onClick={() => setInboxFilter('all')}
                        className={`flex-1 py-1 rounded-md transition-colors cursor-pointer text-center ${
                          inboxFilter === 'all'
                            ? 'bg-white text-zinc-950 font-bold shadow-xs'
                            : 'hover:text-zinc-900'
                        }`}
                      >
                        All ({conversations.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setInboxFilter('unread')}
                        className={`flex-1 py-1 rounded-md transition-colors cursor-pointer text-center ${
                          inboxFilter === 'unread'
                            ? 'bg-white text-blue-600 font-bold shadow-xs'
                            : 'hover:text-zinc-900'
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setInboxFilter('blocked')}
                        className={`flex-1 py-1 rounded-md transition-colors cursor-pointer text-center ${
                          inboxFilter === 'blocked'
                            ? 'bg-white text-rose-600 font-bold shadow-xs'
                            : 'hover:text-zinc-900'
                        }`}
                      >
                        Blocked ({blockedCount})
                      </button>
                    </div>
                  </div>

                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/70 p-2 space-y-1.5">
                    {filteredConvs.length === 0 ? (
                      <div className="py-16 text-center text-xs text-zinc-400 font-mono px-4">
                        {inboxSearch.trim() || inboxFilter !== 'all'
                          ? 'No inquiries match this search or filter.'
                          : 'No visitor conversations yet.'}
                      </div>
                    ) : (
                      filteredConvs.map((c) => {
                        const isSelected = activeConversation?.id === c.id;
                        const hasUnread = (c.unreadAdminCount ?? 0) > 0;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setActiveConversation(c);
                              setMobileChatView(true);
                            }}
                            className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-blue-50/90 border-blue-300 shadow-xs'
                                : 'bg-white hover:bg-zinc-100/90 border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-7 h-7 rounded-full bg-zinc-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {(c.visitorName || 'V').slice(0, 1).toUpperCase()}
                                </div>
                                <span className="font-bold text-xs text-zinc-950 truncate">
                                  {c.visitorName || 'Visitor'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {c.isBlocked && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300 uppercase">
                                    Blocked
                                  </span>
                                )}
                                {hasUnread && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shrink-0">
                                    {c.unreadAdminCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-zinc-600 truncate mb-1">
                              {c.lastMessageText || 'Started conversation'}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span>{new Date(c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              <span>{new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Active Message Thread & Chat Window (Full width on mobile when mobileChatView) */}
                <div
                  className={`flex-1 flex flex-col overflow-hidden bg-white ${
                    !mobileChatView ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {activeConversation ? (
                    <>
                      {/* Chat Header Bar */}
                      <div className="p-3.5 sm:p-4 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3">
                          {/* Mobile Back Button */}
                          <button
                            type="button"
                            onClick={() => setMobileChatView(false)}
                            className="md:hidden p-1.5 -ml-1 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 cursor-pointer"
                            aria-label="Back to conversations list"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>

                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {(activeConversation.visitorName || 'V').slice(0, 1).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-zinc-950">
                                {activeConversation.visitorName || 'Visitor'}
                              </span>
                              {activeConversation.isBlocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  BLOCKED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ACTIVE VISITOR
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              Visitor ID: {activeConversation.visitorId}
                            </div>
                          </div>
                        </div>

                        {/* Block / Unblock Action Button */}
                        <div>
                          {activeConversation.isBlocked ? (
                            <button
                              type="button"
                              onClick={() =>
                                setBlockConfirmDialog({
                                  isOpen: true,
                                  conversation: activeConversation,
                                  action: 'unblock',
                                })
                              }
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Unblock Visitor</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setBlockConfirmDialog({
                                  isOpen: true,
                                  conversation: activeConversation,
                                  action: 'block',
                                })
                              }
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Block Visitor</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages Area (Occupies Full Available Height & Smooth Scroll) */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-50/50">
                        {chatMessages.length === 0 ? (
                          <div className="py-24 text-center text-xs text-zinc-400 font-mono">
                            No messages yet in this visitor conversation.
                          </div>
                        ) : (
                          chatMessages.map((m) => {
                            const isAdminMsg = m.from === 'admin';
                            const formattedTime = new Date(m.time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={m.id}
                                className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                              >
                                <div className="text-[10px] text-zinc-400 mb-1 px-1 font-mono flex items-center gap-1.5">
                                  <span>{isAdminMsg ? 'Platform Administrator (You)' : activeConversation.visitorName}</span>
                                  <span>·</span>
                                  <span>{formattedTime}</span>
                                </div>

                                <div
                                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                                    isAdminMsg
                                      ? 'bg-zinc-950 text-white rounded-tr-none'
                                      : 'bg-white border border-zinc-200/90 text-zinc-900 rounded-tl-none'
                                  }`}
                                >
                                  {m.imageUrl && (
                                    <div
                                      onClick={() => setAdminPreviewLightbox(m.imageUrl || null)}
                                      className="mb-2.5 overflow-hidden rounded-xl border border-zinc-700/30 cursor-pointer group relative max-w-sm"
                                    >
                                      <img
                                        src={m.imageUrl}
                                        alt="Attachment"
                                        className="max-h-72 w-auto max-w-full rounded-xl object-contain bg-black/10 group-hover:opacity-95 transition-opacity"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-mono transition-opacity">
                                        Click to enlarge
                                      </div>
                                    </div>
                                  )}
                                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={adminChatEndRef} />
                      </div>

                      {/* Blocked Status Banner if visitor is blocked */}
                      {activeConversation.isBlocked && (
                        <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              <strong>Visitor is marked as BLOCKED.</strong> They cannot send new messages. All existing messages remain permanently preserved.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setBlockConfirmDialog({
                                isOpen: true,
                                conversation: activeConversation,
                                action: 'unblock',
                              })
                            }
                            className="underline font-bold text-rose-900 cursor-pointer text-xs shrink-0 ml-2"
                          >
                            Unblock Now
                          </button>
                        </div>
                      )}

                      {/* Attached Image Preview for Admin */}
                      {adminReplyImage && (
                        <div className="px-4 py-2.5 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={adminReplyImage}
                              alt="Preview"
                              className="w-12 h-12 object-cover rounded-lg border border-zinc-300 shadow-xs"
                            />
                            <div className="text-xs">
                              <div className="font-semibold text-zinc-900 truncate max-w-xs">
                                {adminReplyImageName || 'Image attached'}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                Ready to send with reply
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminReplyImage(null);
                              setAdminReplyImageName(null);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Reply Input Bar (Permanently Visible at Bottom) */}
                      <div className="p-3 sm:p-4 bg-white border-t border-zinc-200 flex items-center gap-2.5 shrink-0 shadow-xs">
                        <input
                          type="file"
                          ref={adminChatFileInputRef}
                          onChange={handleAdminImageSelect}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => adminChatFileInputRef.current?.click()}
                          disabled={isAdminCompressingImage || replySending}
                          className={`p-3 border rounded-xl transition-colors cursor-pointer shrink-0 ${
                            adminReplyImage
                              ? 'bg-blue-50 border-blue-400 text-blue-600'
                              : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                          }`}
                          title="Attach image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>

                        <input
                          type="text"
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendAdminReply();
                            }
                          }}
                          placeholder={`Reply directly to ${activeConversation.visitorName}...`}
                          className="flex-1 px-4 py-3 text-xs sm:text-sm border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleSendAdminReply}
                          disabled={(!adminReplyText.trim() && !adminReplyImage) || replySending || isAdminCompressingImage}
                          className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-extrabold disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-xs"
                        >
                          <Send className="w-4 h-4" />
                          <span>SEND</span>
                        </button>
                      </div>

                      {/* Admin Image Lightbox */}
                      {adminPreviewLightbox && (
                        <div
                          onClick={() => setAdminPreviewLightbox(null)}
                          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
                        >
                          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
                            <button
                              onClick={() => setAdminPreviewLightbox(null)}
                              className="absolute -top-10 right-0 text-white hover:text-zinc-300 p-1 cursor-pointer"
                            >
                              <X className="w-6 h-6" />
                            </button>
                            <img
                              src={adminPreviewLightbox}
                              alt="Full size attachment"
                              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-zinc-300 mb-3" />
                      <h4 className="text-sm font-bold text-zinc-700 mb-1">Select a Visitor Conversation</h4>
                      <p className="text-xs max-w-sm text-zinc-400">
                        Choose an inquiry from the list on the left to read messages, view media, send replies, or manage visitor access.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Block / Unblock Confirmation Modal Dialog */}
          {blockConfirmDialog && blockConfirmDialog.isOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      blockConfirmDialog.action === 'block'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}
                  >
                    {blockConfirmDialog.action === 'block' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950">
                      {blockConfirmDialog.action === 'block'
                        ? `Block "${blockConfirmDialog.conversation.visitorName}"?`
                        : `Unblock "${blockConfirmDialog.conversation.visitorName}"?`}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      UID: {blockConfirmDialog.conversation.visitorId}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed mb-6">
                  {blockConfirmDialog.action === 'block' ? (
                    <>
                      Are you sure you want to <strong>block this visitor</strong>? Once confirmed, this visitor will be permanently marked as blocked in Firestore and <strong>forbidden from sending new messages</strong>. All existing conversation history and media remain permanently preserved.
                    </>
                  ) : (
                    <>
                      Are you sure you want to <strong>unblock this visitor</strong>? This will restore their authorization to send messages on their private line.
                    </>
                  )}
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setBlockConfirmDialog(null)}
                    disabled={blockActionLoading}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBlockToggle}
                    disabled={blockActionLoading}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shadow-xs ${
                      blockConfirmDialog.action === 'block'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {blockActionLoading
                      ? 'Updating...'
                      : blockConfirmDialog.action === 'block'
                      ? 'Confirm Block'
                      : 'Confirm Unblock'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5.5: USER ACCOUNTS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span>User Accounts & Security Roles</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Live accounts stored in Firestore <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded font-mono">users</code> and <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded font-mono">admins</code> collections.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, email, or UID..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 w-56 sm:w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Total Marketplace Users
                  </span>
                  <span className="text-2xl font-black text-zinc-950 font-mono tabular-nums">
                    {usersList.length}
                  </span>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                    Platform Administrators
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                    {usersList.filter((u) => u.role === 'admin').length}
                  </span>
                </div>
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                    Anonymous Chat Visitors
                  </span>
                  <span className="text-2xl font-black text-purple-700 font-mono tabular-nums">
                    {usersList.filter((u) => u.isAnonymous).length}
                  </span>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Firebase Account UID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {usersList
                      .filter((u) => {
                        if (!userSearchTerm.trim()) return true;
                        const term = userSearchTerm.toLowerCase();
                        return (
                          (u.displayName && u.displayName.toLowerCase().includes(term)) ||
                          (u.email && u.email.toLowerCase().includes(term)) ||
                          u.id.toLowerCase().includes(term)
                        );
                      })
                      .map((u) => {
                        const isSelf = u.id === adminId || (u.email && u.email === adminEmail);
                        const isOwner = u.email?.toLowerCase() === 'sirrodstephen@gmail.com';

                        return (
                          <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                                  {u.displayName ? u.displayName.charAt(0) : 'U'}
                                </div>
                                <div>
                                  <div className="font-semibold text-zinc-900">
                                    {u.displayName || 'Unnamed User'}
                                    {isSelf && (
                                      <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-500">
                                    {u.email || (u.isAnonymous ? 'Anonymous Session' : 'No email')}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                              <span
                                className="hover:text-blue-600 cursor-pointer select-all"
                                title="Click to copy UID"
                                onClick={() => {
                                  navigator.clipboard?.writeText(u.id);
                                }}
                              >
                                {u.id.slice(0, 14)}...
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {u.isAnonymous ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                                  Anonymous
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  Google Account
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Administrator</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                                  Standard User
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isOwner && (
                                  <button
                                    onClick={() => handleToggleUserRole(u)}
                                    disabled={userActionLoading === u.id}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                                      u.role === 'admin'
                                        ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {u.role === 'admin' ? 'Revoke Admin' : 'Promote to Admin'}
                                  </button>
                                )}

                                {!isSelf && !isOwner && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={userActionLoading === u.id}
                                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Delete user profile"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {usersList.length === 0 && (
                  <div className="text-center py-12 text-xs text-zinc-400">
                    No users recorded in Firestore yet. User profiles are automatically created when visitors browse, save items, or request chat.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: REPORTS */}
          {activeTab === 'reports' && (
            <div>
              <div className="pb-4 border-b border-zinc-200 mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Safety & Moderation Reports</h2>
              </div>

              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-zinc-200 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              r.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.status.toUpperCase()}
                          </span>
                          <span className="text-zinc-500 font-mono">Conv: {r.conversationId}</span>
                        </div>
                        <p className="text-xs text-zinc-800">
                          <strong>Reason:</strong> {r.reason}
                        </p>
                      </div>

                      {r.status === 'pending' && (
                        <button
                          onClick={() => resolveReport(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-zinc-400">
                  No pending moderation reports.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div>
              <div className="pb-4 border-b border-zinc-200 mb-6">
                <h2 className="text-xl font-bold text-zinc-950">Immutable Administrator Audit Trail</h2>
                <p className="text-xs text-zinc-500">
                  Every publish, update, and deletion action recorded to Firestore `adminAuditLogs`.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Admin</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-3 text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-800">{log.adminEmail}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">{log.action}</td>
                        <td className="py-2.5 px-3 text-zinc-600">
                          {log.targetType}: {log.targetId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: OWNERSHIP & AUTHENTICITY VERIFICATION */}
          {activeTab === 'verification' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 mb-6 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Official Governance & Compliance</span>
                  </div>
                  <h2 className="text-xl font-bold text-zinc-950">
                    Ownership & Authenticity Verification Manager
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Maintain verified legal ownership documentation, company registration records, and third-party audit credentials.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <VerificationBadge record={verificationRecord} size="md" />
                </div>
              </div>

              {/* Strict Integrity Warning Banner */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 mb-6 flex items-start gap-3">
                <Scale className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold">Mandatory Authenticity & Non-Affiliation Directive</strong>
                  <p className="text-blue-900 leading-relaxed">
                    The blue verification badge must only appear when authentic ownership documentation has been verified by an authorized independent verification registry. 
                    Never invent endorsements, partnerships, ownership claims or authorization. 
                    The website must always clearly disclose that it is an independent catalog and not operated or endorsed by Elon Musk.
                  </p>
                </div>
              </div>

              {verificationSaveNotice && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{verificationSaveNotice}</span>
                </div>
              )}

              {/* Form & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Inputs (2 Cols) */}
                <form onSubmit={handleSaveVerification} className="lg:col-span-2 space-y-6">
                  
                  {/* Status & Verification Toggle */}
                  <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-zinc-700 font-mono">
                        Verification Audit Status
                      </label>
                      <span className="text-[11px] font-mono text-zinc-500">Controls Blue Badge Visibility</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <select
                          value={vStatus}
                          onChange={(e) => {
                            const val = e.target.value as VerificationStatus;
                            setVStatus(val);
                            if (val === 'verified') {
                              setVIsVerified(true);
                            } else {
                              setVIsVerified(false);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-blue-600"
                        >
                          <option value="pending_audit">Pending Independent Audit (Badge In Review)</option>
                          <option value="verified">Verified by Authorized Provider (Blue Badge Active)</option>
                          <option value="unverified">Unverified / Awaiting Documentation (No Badge)</option>
                          <option value="rejected">Documentation Rejected / Revision Required</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-zinc-300">
                        <input
                          type="checkbox"
                          id="isVerifiedToggle"
                          checked={vIsVerified}
                          onChange={(e) => {
                            setVIsVerified(e.target.checked);
                            if (e.target.checked) setVStatus('verified');
                            else if (vStatus === 'verified') setVStatus('pending_audit');
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-zinc-300"
                        />
                        <label htmlFor="isVerifiedToggle" className="text-xs font-bold text-zinc-900 cursor-pointer">
                          Activate Blue Verification Badge
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Legal Ownership & Operating Company */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 pb-2 border-b border-zinc-200">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Legal Identity & Operating Entity</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Verified Legal Owner Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={vOwnerName}
                          onChange={(e) => setVOwnerName(e.target.value)}
                          placeholder="e.g. Stephen Sirrod"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Publicly displayed only when verified by authentic documentation.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Operating Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={vCompany}
                          onChange={(e) => setVCompany(e.target.value)}
                          placeholder="e.g. Independent Platform Administration & Media"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Company Registration / Filing ID
                        </label>
                        <input
                          type="text"
                          value={vRegNumber}
                          onChange={(e) => setVRegNumber(e.target.value)}
                          placeholder="e.g. REG-TX-2026-90412"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Jurisdiction of Operation
                        </label>
                        <input
                          type="text"
                          value={vJurisdiction}
                          onChange={(e) => setVJurisdiction(e.target.value)}
                          placeholder="e.g. United States & Global Cloud Operations"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Official Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 pb-2 border-b border-zinc-200">
                      <span>Official Contact Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Official Contact Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={vEmail}
                          onChange={(e) => setVEmail(e.target.value)}
                          placeholder="e.g. sirrodstephen@gmail.com"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Support Hotline (Optional)
                        </label>
                        <input
                          type="text"
                          value={vPhone}
                          onChange={(e) => setVPhone(e.target.value)}
                          placeholder="e.g. +1 (800) 555-0199"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Registered Business Address
                      </label>
                      <input
                        type="text"
                        value={vAddress}
                        onChange={(e) => setVAddress(e.target.value)}
                        placeholder="e.g. Independent Administrative Command, Austin, TX & Global Cloud Network"
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Section 3: Third-Party Verification Provider Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 pb-2 border-b border-zinc-200">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Legitimate Authorized Verification Provider Credentials</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Verification Provider Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={vProvider}
                          onChange={(e) => setVProvider(e.target.value)}
                          placeholder="e.g. Independent Third-Party Verification Authority"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Verification Date
                        </label>
                        <input
                          type="date"
                          value={vDate}
                          onChange={(e) => setVDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Public Verification Source URL
                        </label>
                        <input
                          type="url"
                          value={vSourceUrl}
                          onChange={(e) => setVSourceUrl(e.target.value)}
                          placeholder="https://registry.example.org/audit/12345"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Certificate Reference / Audit ID
                        </label>
                        <input
                          type="text"
                          value={vCertId}
                          onChange={(e) => setVCertId(e.target.value)}
                          placeholder="e.g. AUTH-VERIF-2026-CERT"
                          className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Documentation Audit Notes
                      </label>
                      <textarea
                        rows={2}
                        value={vNotes}
                        onChange={(e) => setVNotes(e.target.value)}
                        placeholder="Notes regarding submitted corporate identity and technical documentation review..."
                        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Section 4: Non-Affiliation Disclaimer */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Independent Platform Disclaimer Text
                    </label>
                    <textarea
                      rows={3}
                      value={vDisclaimer}
                      onChange={(e) => setVDisclaimer(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-700 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Form Submission */}
                  <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                    <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Security rule enforced (Admin UID only)</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingVerification}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingVerification ? 'Saving to Firestore...' : 'Save Verification Record'}
                    </button>
                  </div>
                </form>

                {/* Live Public Preview Card (1 Col) */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
                    Live Public Preview
                  </div>

                  <div className="p-5 bg-zinc-950 text-white rounded-2xl border border-zinc-800 space-y-4 shadow-md">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <span className="text-xs font-bold text-zinc-200 font-mono">Public Status Preview</span>
                      <VerificationBadge
                        record={{
                          id: 'preview',
                          status: vStatus,
                          isVerified: vStatus === 'verified' && vIsVerified,
                          legalOwnerName: vOwnerName,
                          operatingCompanyName: vCompany,
                          officialContactEmail: vEmail,
                          verificationProvider: vProvider,
                          verificationDate: vDate,
                          verificationSourceUrl: vSourceUrl,
                          certificateId: vCertId,
                          disclaimer: vDisclaimer,
                          updatedAt: new Date().toISOString(),
                          updatedBy: adminEmail,
                        }}
                        size="md"
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] font-mono block">VERIFIED OWNER</span>
                        <span className="font-bold text-white text-sm">
                          {vStatus === 'verified' && vIsVerified
                            ? vOwnerName || 'Verified Legal Owner'
                            : 'Submitted · Validation Pending'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] font-mono block">OPERATING ENTITY</span>
                        <span className="text-zinc-300">{vCompany || 'Operating Entity'}</span>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] font-mono block">REGISTRATION NO.</span>
                        <span className="text-zinc-300 font-mono">{vRegNumber || 'REG-PENDING'}</span>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] font-mono block">AUDIT PROVIDER</span>
                        <span className="text-zinc-300">{vProvider || 'Authorized Registry'}</span>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] font-mono block">DATE & REF</span>
                        <span className="text-zinc-300 font-mono text-[11px]">
                          {vDate || 'In Progress'} · {vCertId || 'CERT-PENDING'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                      {vNotes || 'Documentation review in progress.'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
