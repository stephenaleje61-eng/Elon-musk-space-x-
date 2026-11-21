import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { SECTIONS } from './data/sections';
import { Product, Article, SavedItem, SectionId, VerificationRecord } from './types';
import {
  seedDatabaseIfEmpty,
  subscribeToProducts,
  subscribeToArticles,
  subscribeToSavedItems,
  toggleSavedItem,
  subscribeToVerificationRecord,
  DEFAULT_VERIFICATION_RECORD,
} from './firebase/database';
import { subscribeToAuth, ensureAnonymousAuth } from './firebase/auth';

// Components
import { Navbar } from './components/Navbar';
import { WelcomeHero } from './components/WelcomeHero';
import { NineSectionsBar } from './components/NineSectionsBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SectionView } from './components/SectionView';
import { InvestmentHubView } from './components/InvestmentHubView';
import { DirectPrivateChat } from './components/DirectPrivateChat';
import { RecipientInboxView } from './components/RecipientInboxView';
import { SearchModal } from './components/SearchModal';
import { SavedDrawer } from './components/SavedDrawer';
import { Footer } from './components/Footer';
import { LegalPolicyModal } from './components/LegalPolicyModal';
import { OwnershipVerificationSection } from './components/OwnershipVerificationSection';
import { OwnershipVerificationModal } from './components/OwnershipVerificationModal';

type AppView = SectionId | 'home' | 'investment-hub' | 'verification' | 'chat' | 'recipient-inbox';

export default function App() {
  const initialIsRecipientPath =
    typeof window !== 'undefined' &&
    window.location.pathname.toLowerCase().startsWith('/recipient-inbox');

  const initialIsChatPath =
    typeof window !== 'undefined' &&
    window.location.pathname.toLowerCase().startsWith('/chat');

  const [currentView, setCurrentView] = useState<AppView>(
    initialIsRecipientPath ? 'recipient-inbox' : initialIsChatPath ? 'chat' : 'home'
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Firestore Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [verificationRecord, setVerificationRecord] = useState<VerificationRecord>(
    DEFAULT_VERIFICATION_RECORD
  );

  // Auth State
  const [user, setUser] = useState<{ uid: string; email?: string | null } | null>(null);
  const [isRecipient, setIsRecipient] = useState(false);

  // Modals, Drawers & Direct Chat Draft
  const [chatDraftMessage, setChatDraftMessage] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | 'disclaimer' | null>(null);

  useEffect(() => {
    seedDatabaseIfEmpty();

    const unsubProducts = subscribeToProducts((prods) => {
      setProducts(prods);
    });

    const unsubArticles = subscribeToArticles((arts) => {
      setArticles(arts);
    });

    const unsubAuth = subscribeToAuth((fbUser, recipientFlag) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email });
        setIsRecipient(recipientFlag);
      } else {
        setUser(null);
        setIsRecipient(false);
      }
    });

    const unsubVerification = subscribeToVerificationRecord((rec) => {
      setVerificationRecord(rec);
    });

    return () => {
      unsubProducts();
      unsubArticles();
      unsubAuth();
      unsubVerification();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSavedItems(user.uid, (items) => {
      setSavedItems(items);
      setSavedItemIds(new Set(items.map((i) => i.itemId)));
    });
    return () => unsub();
  }, [user]);

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

  const handleOpenChat = useCallback((initialMessage?: string) => {
    if (initialMessage) {
      setChatDraftMessage(initialMessage);
    }
    setCurrentView('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearDraft = useCallback(() => {
    setChatDraftMessage(undefined);
  }, []);

  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 6);
  const featuredArticles = articles.filter((a) => a.isFeatured).slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navigation Header (Zero Admin Dashboard Menus or Auth Gates) */}
      <Navbar
        activeSection={currentView}
        onNavigate={(sec) => {
          setCurrentView(sec);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenChat={handleOpenChat}
        onOpenSearch={() => setSearchOpen(true)}
        savedCount={savedItems.length}
        onOpenSavedDrawer={() => setSavedDrawerOpen(true)}
        verificationRecord={verificationRecord}
        onOpenVerification={() => setVerificationModalOpen(true)}
      />

      {/* Nine Sections Fast Bar */}
      {currentView !== 'chat' && currentView !== 'recipient-inbox' && (
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
        {/* VIEW: FULL-SCREEN DIRECT PRIVATE CHAT */}
        {currentView === 'chat' && (
          <DirectPrivateChat
            variant="fullscreen"
            initialDraft={chatDraftMessage}
            onClearDraft={handleClearDraft}
            onBackToMarketplace={() => setCurrentView('home')}
            onToggleExpand={() => setCurrentView('home')}
          />
        )}

        {/* VIEW: UNLISTED RECIPIENT REPLY WORKFLOW (Never linked in public UI) */}
        {currentView === 'recipient-inbox' && (
          <RecipientInboxView
            user={user}
            isRecipient={isRecipient}
            onBackToSite={() => {
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/');
              }
              setCurrentView('home');
            }}
          />
        )}

        {/* VIEW: INVESTMENT HUB (SECTION 09) */}
        {currentView === 'investment-hub' && (
          <InvestmentHubView onOpenChat={handleOpenChat} />
        )}

        {/* VIEW: OWNERSHIP & AUTHENTICITY VERIFICATION */}
        {currentView === 'verification' && (
          <OwnershipVerificationSection
            record={verificationRecord}
            onOpenPolicy={(type) => setPolicyType(type)}
          />
        )}

        {/* VIEW: SECTION DETAIL VIEW (SECTIONS 1–8) */}
        {currentView !== 'home' &&
          currentView !== 'chat' &&
          currentView !== 'recipient-inbox' &&
          currentView !== 'investment-hub' &&
          currentView !== 'verification' &&
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

        {/* VIEW: HOMEPAGE */}
        {currentView === 'home' && (
          <div>
            {/* Welcome Hero */}
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
              onChatPrivately={() => {
                const chatEl = document.getElementById('direct-private-chat');
                if (chatEl) {
                  chatEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleOpenChat();
                }
              }}
              verificationRecord={verificationRecord}
              onOpenVerification={() => setVerificationModalOpen(true)}
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
            <section
              id="featured-marketplace"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-b border-zinc-200"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-blue-600 mb-1 font-semibold">
                    MARKETPLACE CATALOG
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                    Featured Technology &amp; Vehicles
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenChat('Inquiry regarding premier featured allocations.')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Inquire Directly</span>
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
                        `Inquiry regarding ${p.title} ($${Number(p.price || 0).toLocaleString()}): availability and delivery scheduling.`
                      )
                    }
                  />
                ))}
              </div>
            </section>

            {/* DEDICATED HOMEPAGE SECTION: ELON MUSK – DIRECT PRIVATE CHAT */}
            <section
              id="direct-private-chat"
              className="bg-black text-white border-b border-zinc-800 py-14 sm:py-20"
            >
              <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1.5">
                      PRIVATE ONE-TO-ONE REAL-TIME MESSAGING
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      ELON MUSK – DIRECT PRIVATE CHAT
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-2xl">
                      Send text, pictures, camera snapshots, and voice messages directly. Your private conversation stays synced across page refreshes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenChat()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-end"
                  >
                    <span>Open Full-Screen View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <DirectPrivateChat
                  variant="embedded"
                  onToggleExpand={() => handleOpenChat()}
                />
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
                    Latest Technical Publications &amp; Research
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

            {/* Official Ownership & Authenticity Verification Section on Homepage */}
            <OwnershipVerificationSection
              record={verificationRecord}
              onOpenPolicy={(type) => setPolicyType(type)}
            />
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

      <LegalPolicyModal
        type={policyType}
        onClose={() => setPolicyType(null)}
      />

      <OwnershipVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        record={verificationRecord}
        onOpenPolicy={(type) => setPolicyType(type)}
      />

      {/* Footer (Zero Admin Links) */}
      {currentView !== 'chat' && currentView !== 'recipient-inbox' && (
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
          verificationRecord={verificationRecord}
          onOpenVerification={() => setVerificationModalOpen(true)}
        />
      )}
    </div>
  );
}
