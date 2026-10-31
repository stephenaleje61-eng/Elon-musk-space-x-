import React, { useState } from 'react';
import { MessageSquare, ArrowLeft, Filter, BookOpen, Layers } from 'lucide-react';
import { SectionMeta, Product, Article } from '../types';
import { ProductCard } from './ProductCard';

interface SectionViewProps {
  section: SectionMeta;
  products: Product[];
  articles: Article[];
  onSelectProduct: (product: Product) => void;
  onToggleSaveProduct: (product: Product) => void;
  savedItemIds: Set<string>;
  onOpenChat: (initialMessage?: string) => void;
  onBackToHome: () => void;
}

export const SectionView: React.FC<SectionViewProps> = ({
  section,
  products,
  articles,
  onSelectProduct,
  onToggleSaveProduct,
  savedItemIds,
  onOpenChat,
  onBackToHome,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'products' | 'articles'>('products');

  const sectionProducts = products.filter((p) => p.sectionId === section.id);
  const filteredProducts =
    selectedCategory === 'all'
      ? sectionProducts
      : sectionProducts.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());

  const sectionArticles = articles.filter((a) => a.sectionId === section.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Section Header Banner */}
      <div className="bg-zinc-950 text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Marketplace Index</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest font-mono text-blue-400 mb-2">
                <span>SECTION {section.number}</span>
                <span>/</span>
                <span>CATALOGUE & RESEARCH</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
                {section.name}
              </h1>
              <p className="text-base sm:text-lg text-zinc-300 font-medium mb-3">
                {section.tagline}
              </p>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
                {section.description}
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={() =>
                  onOpenChat(`Inquiring regarding products and technical programs in ${section.name}.`)
                }
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <MessageSquare className="w-4 h-4 text-black" />
                <span>MESSAGE ELON MUSK</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Switcher Tabs: Products vs Technical Articles */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hardware & Equipment ({sectionProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'articles'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Technical Publications ({sectionArticles.length})</span>
            </button>
          </div>

          <div className="text-xs text-zinc-400 hidden sm:block">
            Verified persistent Firestore entries
          </div>
        </div>

        {activeTab === 'products' && (
          <div>
            {/* Category Segmented Filter Buttons */}
            <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                All Categories
              </button>

              {section.categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Product Grid (3-column desktop) */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={onSelectProduct}
                    onToggleSave={onToggleSaveProduct}
                    isSaved={savedItemIds.has(prod.id)}
                    onQuickChat={(p) =>
                      onOpenChat(
                        `Inquiry regarding ${p.title} ($${p.price.toLocaleString()}): allocation scheduling.`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 p-8">
                <div className="text-sm font-semibold text-zinc-800 mb-1">
                  No products in selected category yet
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  Administrators can publish new hardware or vehicles directly from the Admin Panel.
                </p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  View All {section.shortName} Hardware
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            {sectionArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sectionArticles.map((art) => (
                  <article
                    key={art.id}
                    className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-300 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2 font-medium">
                        <span className="text-blue-600 font-semibold">{art.category}</span>
                        <span>·</span>
                        <span>{art.readTime}</span>
                        <span>·</span>
                        <span>{art.publishedAt}</span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-950 mb-2 leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs text-zinc-600 mb-4 leading-relaxed font-normal">
                        {art.subtitle}
                      </p>
                      <div className="text-xs text-zinc-700 whitespace-pre-line leading-relaxed mb-4 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                        {art.content}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                      <span>Author: <strong className="text-zinc-800">{art.author}</strong></span>
                      <button
                        onClick={() =>
                          onOpenChat(`Discussion regarding article: "${art.title}"`)
                        }
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Discuss with Admin</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 p-8">
                <div className="text-sm font-semibold text-zinc-800 mb-1">
                  No technical articles published for this section yet
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  The administrator publishes aerospace, robotics, and energy papers continuously.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
