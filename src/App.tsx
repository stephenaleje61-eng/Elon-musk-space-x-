import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  Layers,
  ChevronRight,
  Bookmark,
  Share2,
} from 'lucide-react';
import { SECTIONS } from './data/sections';
import { Product, Article, SavedItem, SectionId } from './types';
import {
  seedDatabaseIfEmpty,
  subscribeToProducts,
  subscribeToArticles,
  subscribeToSavedItems,
  toggleSavedItem,
} from './firebase/database';
import { subscribeToAuth, ensureAnonymousAuth, logOutUser } from './firebase/auth';

// Components
import { Navbar } from './components/Navbar';
import { WelcomeHero } from './components/WelcomeHero';
import { NineSectionsBar } from './components/NineSectionsBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SectionView } from './components/SectionView';
import { InvestmentHubView } from './components/InvestmentHubView';
import { ChatElonMuskModal } from './components/ChatElonMuskModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';
import { SearchModal } from './components/SearchModal';
import { SavedDrawer } from './components/SavedDrawer';
import { Footer } from './components/Footer';
import { LegalPolicyModal } from './components/LegalPolicyModal';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<SectionId | 'home' | 'investment-hub' | 'admin'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Firestore Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());

  // Auth State
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>('');

  // Modals & Drawers
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | 'disclaimer' | null>(null);

  // Initialize Firebase listeners and database seeding
  useEffect(() => {
    // 1. Seed database with rich catalog if empty
    seedDatabaseIfEmpty();

    // 2. Real-time product catalog listener
    const unsubProducts = subscribeToProducts((prods) => {
      setProducts(prods);
    });

    // 3. Real-time articles listener
    const unsubArticles = subscribeToArticles((arts) => {
      setArticles(arts);
    });

    // 4. Auth State Listener
    const unsubAuth = subscribeToAuth((fbUser, isUserAdmin) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email });
        setIsAdmin(isUserAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      unsubProducts();
      unsubArticles();
      unsubAuth();
    };
  }, []);

  // Listen to saved items when user exists
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSavedItems(user.uid, (items) => {
      setSavedItems(items);
      setSavedItemIds(new Set(items.map((i) => i.itemId)));
    });
    return () => unsub();
  }, [user]);

  // Handlers
  const handleToggleSave = async (prod: Product) => {
    try {
      let activeUid = user?.uid;
      if (!activeUid) {
        const anonUser = await ensureAnonymousAuth();
        activeUid = anonUser.uid;
      }
      await toggleSavedItem(activeUid, {
        userId: activeUid,
        itemId: prod.id,
        itemType: 'product',
        title: prod.title,
        image: prod.images?.[0] || '',
        price: prod.price,
        sectionId: prod.sectionId,
      });
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  const handleOpenChat = (initialMessage?: string) => {
    setChatInitialMessage(initialMessage);
    setChatOpen(true);
  };

  const handleLogout = async () => {
    await logOutUser();
    setIsAdmin(false);
    setAdminEmail('');
    setCurrentView('home');
  };

  // Featured Products and Articles for Homepage
  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 6);
  const featuredArticles = articles.filter((a) => a.isFeatured).slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeSection={currentView}
        onNavigate={(sec) => {
          if (sec === 'admin' && !isAdmin) {
            setAdminAuthOpen(true);
          } else {
            setCurrentView(sec);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenChat={handleOpenChat}
        onOpenSearch={() => setSearchOpen(true)}
        savedCount={savedItems.length}
        onOpenSavedDrawer={() => setSavedDrawerOpen(true)}
        isAdmin={isAdmin}
        userEmail={user?.email}
        onLogout={handleLogout}
        onOpenAdminAuth={() => setAdminAuthOpen(true)}
      />

      {/* Nine Sections Fast Bar (visible across main views) */}
      {currentView !== 'admin' && (
        <NineSectionsBar
          activeSection={currentView}
          onSelectSection={(secId) => {
            if (secId === 'investment') {
              setCurrentView('investment-hub');
            } else {
              setCurrentView(secId);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Main View Switcher */}
      <main className="flex-1">
        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && isAdmin && (
          <AdminDashboard
            products={products}
            articles={articles}
            adminEmail={user?.email || adminEmail || 'sirrodstephen@gmail.com'}
            adminId={user?.uid || 'admin'}
            onLogout={handleLogout}
            onBackToStore={() => setCurrentView('home')}
          />
        )}

        {/* VIEW: INVESTMENT HUB (SECTION 09) */}
        {currentView === 'investment-hub' && (
          <InvestmentHubView onOpenChat={handleOpenChat} />
        )}

        {/* VIEW: SECTION DETAIL VIEW (SECTIONS 1–8) */}
        {currentView !== 'home' &&
          currentView !== 'admin' &&
          currentView !== 'investment-hub' &&
          SECTIONS.find((s) => s.id === currentView) && (
            <SectionView
              section={SECTIONS.find((s) => s.id === currentView)!}
              products={products}
              articles={articles}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onToggleSaveProduct={handleToggleSave}
              savedItemIds={savedItemIds}
              onOpenChat={handleOpenChat}
              onBackToHome={() => setCurrentView('home')}
            />
          )}

        {/* VIEW: HOMEPAGE (ZERO-LOGIN OPEN MARKETPLACE) */}
        {currentView === 'home' && (
          <div>
            {/* Section 5: Welcome Hero Screen with 4 Large Buttons */}
            <WelcomeHero
              onExploreProducts={() => {
                const el = document.getElementById('featured-marketplace');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onExploreTechnology={() => {
                setCurrentView('spacex');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onInvestmentInfo={() => {
                setCurrentView('investment-hub');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onChatPrivately={() => handleOpenChat()}
            />

            {/* Nine Sections Architectural Showcase */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-b border-zinc-200">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-blue-600 mb-1 font-semibold">
                    GLOBAL SPECTRUM
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                    Explore All Nine Technology Frontiers
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-md">
                  Complete technical sectors featuring vehicle ordering, orbital manifests, humanoid robotics, and public-market disclosures.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {SECTIONS.map((sec) => (
                  <div
                    key={sec.id}
                    onClick={() => {
                      if (sec.id === 'investment') {
                        setCurrentView('investment-hub');
                      } else {
                        setCurrentView(sec.id);
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-400 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-3">
                        <span className="font-bold text-blue-600">SECTION {sec.number}</span>
                        <span className="text-zinc-400">{sec.categories.length} Categories</span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-950 group-hover:text-blue-600 transition-colors mb-2">
                        {sec.name}
                      </h3>
                      <p className="text-xs text-zinc-600 leading-relaxed mb-4 line-clamp-2">
                        {sec.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-950">
                      <span>Explore Sector</span>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Hardware & Vehicle Marketplace Grid */}
            <section id="featured-marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-b border-zinc-200">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-blue-600 mb-1 font-semibold">
                    MARKETPLACE CATALOG
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                    Featured Technology & Vehicles
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenChat('Inquiry regarding premier featured allocations.')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Inquire via Dispatch</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('tesla')}
                    className="text-xs font-bold text-zinc-950 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Hardware</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Product Grid (3-column desktop layout adhering to design rules) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={(p) => setSelectedProduct(p)}
                    onToggleSave={handleToggleSave}
                    isSaved={savedItemIds.has(prod.id)}
                    onQuickChat={(p) =>
                      handleOpenChat(
                        `Inquiry regarding ${p.title} ($${p.price.toLocaleString()}): allocation scheduling.`
                      )
                    }
                  />
                ))}
              </div>
            </section>

            {/* Section 7 Callout Banner: Prominent CHAT ELON MUSK */}
            <section className="bg-zinc-950 text-white border-b border-zinc-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <div className="text-xs font-mono uppercase text-blue-400 mb-2 tracking-widest">
                    PRIVATE ONE-TO-ONE MESSAGING
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
                    Connect Directly with Platform Administration
                  </h2>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal">
                    Real-time encrypted dispatch via Cloud Firestore. Ask questions about Tesla fleet deliveries, commercial SpaceX Starship payload slots, Starlink maritime equipment, or Optimus enterprise orders.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenChat()}
                  className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-sm rounded-xl shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 shrink-0"
                >
                  <MessageSquare className="w-5 h-5 text-black" />
                  <span>MESSAGE ELON MUSK</span>
                </button>
              </div>
            </section>

            {/* Featured Articles & Research Papers */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-blue-600 mb-1 font-semibold">
                    DEEP-DIVE INTELLIGENCE
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                    Latest Technical Publications & Research
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentView('spacex')}
                  className="text-xs font-bold text-zinc-950 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Research Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredArticles.map((art) => (
                  <article
                    key={art.id}
                    onClick={() => {
                      setCurrentView(art.sectionId);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div>
                      <div className="aspect-16/9 overflow-hidden">
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600';
                          }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium mb-1.5 uppercase font-mono">
                          <span className="text-blue-600 font-bold">{art.sectionId}</span>
                          <span>·</span>
                          <span>{art.readTime}</span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-950 group-hover:text-blue-600 transition-colors mb-2 leading-snug line-clamp-2">
                          {art.title}
                        </h3>
                        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                          {art.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                      <span>{art.publishedAt}</span>
                      <span className="font-semibold text-zinc-950 group-hover:text-blue-600 flex items-center gap-1">
                        Read Analysis <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenChat={handleOpenChat}
        onToggleSave={handleToggleSave}
        isSaved={selectedProduct ? savedItemIds.has(selectedProduct.id) : false}
      />

      <ChatElonMuskModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        isAdmin={isAdmin}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        articles={articles}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onNavigateSection={(secId) => {
          if (secId === 'investment') {
            setCurrentView('investment-hub');
          } else {
            setCurrentView(secId);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <SavedDrawer
        isOpen={savedDrawerOpen}
        onClose={() => setSavedDrawerOpen(false)}
        savedItems={savedItems}
        products={products}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onRemoveSaved={handleToggleSave}
        onOpenChat={handleOpenChat}
      />

      <AdminAuthModal
        isOpen={adminAuthOpen}
        onClose={() => setAdminAuthOpen(false)}
        onSuccess={(email) => {
          setAdminEmail(email);
          setIsAdmin(true);
          setCurrentView('admin');
        }}
      />

      <LegalPolicyModal
        type={policyType}
        onClose={() => setPolicyType(null)}
      />

      {/* Footer */}
      <Footer
        onNavigateSection={(secId) => {
          if (secId === 'investment') {
            setCurrentView('investment-hub');
          } else {
            setCurrentView(secId);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenChat={handleOpenChat}
        onOpenPolicy={(type) => setPolicyType(type)}
        onOpenAdminAuth={() => setAdminAuthOpen(true)}
      />
    </div>
  );
}
