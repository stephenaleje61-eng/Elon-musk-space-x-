import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
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
  UploadCloud,
  Send,
  Eye,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { SECTIONS } from '../data/sections';
import { Product, Article, Conversation, Message, ReportItem, AdminAuditLog, SectionId } from '../types';
import {
  saveProduct,
  deleteProduct,
  saveArticle,
  deleteArticle,
} from '../firebase/database';
import { uploadImage } from '../firebase/storage';
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
    'products' | 'new-product' | 'articles' | 'new-article' | 'inbox' | 'reports' | 'audit'
  >('products');

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
  const [replySending, setReplySending] = useState(false);

  // Reports & Audits
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
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

    return () => {
      unsubConversations();
      unsubReports();
      unsubAudit();
    };
  }, []);

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
        : ['/src/assets/images/hero_elon_musk_space_1793378963159.jpg'];

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
      coverImage: aCoverUrl || '/src/assets/images/hero_elon_musk_space_1793378963159.jpg',
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

  // Send admin reply in chat
  const handleSendAdminReply = async () => {
    if (!adminReplyText.trim() || !activeConversation || replySending) return;
    setReplySending(true);
    try {
      await sendMessage(
        activeConversation.id,
        adminId,
        'admin',
        'Platform Administrator',
        adminReplyText.trim()
      );
      setAdminReplyText('');
    } catch (err) {
      console.error('Reply failed:', err);
    } finally {
      setReplySending(false);
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
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
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
            {conversations.some((c) => c.unreadAdminCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
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
        </aside>

        {/* Right Tab Content View */}
        <main className="flex-1 bg-white rounded-xl border border-zinc-200 p-6 shadow-xs overflow-hidden">
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
                            <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
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

          {/* TAB 5: VISITOR INBOX & REPLIES */}
          {activeTab === 'inbox' && (
            <div className="h-[600px] flex flex-col md:flex-row gap-4">
              {/* Left Conversation List */}
              <div className="w-full md:w-72 border border-zinc-200 rounded-xl overflow-y-auto divide-y divide-zinc-100 shrink-0">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Visitor Inquiries ({conversations.length})
                </div>

                {conversations.map((c) => {
                  const isSelected = activeConversation?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConversation(c)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-zinc-900 truncate">
                          {c.visitorName || 'Visitor'}
                        </span>
                        {c.unreadAdminCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mb-1">
                        {c.lastMessageText || 'Started conversation'}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {conversations.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    No visitor conversations yet.
                  </div>
                )}
              </div>

              {/* Right Active Message Thread & Reply Box */}
              <div className="flex-1 border border-zinc-200 rounded-xl flex flex-col overflow-hidden bg-zinc-50">
                {activeConversation ? (
                  <>
                    <div className="p-3.5 bg-white border-b border-zinc-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-zinc-900">
                          {activeConversation.visitorName}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          ID: {activeConversation.visitorId}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          toggleBlockConversation(activeConversation.id, !activeConversation.isBlocked)
                        }
                        className={`text-xs px-2.5 py-1 rounded font-semibold cursor-pointer ${
                          activeConversation.isBlocked
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        {activeConversation.isBlocked ? 'Unblock' : 'Block Visitor'}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map((m) => {
                        const isAdminMsg = m.from === 'admin';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[10px] text-zinc-400 mb-0.5">
                              {isAdminMsg ? 'Platform Admin (You)' : activeConversation.visitorName}
                            </span>
                            <div
                              className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs ${
                                isAdminMsg
                                  ? 'bg-zinc-950 text-white'
                                  : 'bg-white border border-zinc-200 text-zinc-900'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
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
                        placeholder="Reply directly to visitor as administrator..."
                        className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        onClick={handleSendAdminReply}
                        disabled={!adminReplyText.trim() || replySending}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">
                    Select a conversation on the left to read and respond.
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
        </main>
      </div>
    </div>
  );
};
