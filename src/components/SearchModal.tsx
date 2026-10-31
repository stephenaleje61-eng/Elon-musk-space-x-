import React, { useState } from 'react';
import { Search, X, ArrowRight, Layers, FileText } from 'lucide-react';
import { Product, Article, SectionId } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  articles: Article[];
  onSelectProduct: (product: Product) => void;
  onNavigateSection: (sectionId: SectionId) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  articles,
  onSelectProduct,
  onNavigateSection,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedProducts = q
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sectionId.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : [];

  const matchedArticles = q
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.sectionId.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-zinc-950/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-200 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all 9 sections: Cybertruck, Starship, Optimus, Starlink, xAI, TSLA..."
            autoFocus
            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-zinc-900 placeholder:text-zinc-400"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-950 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {q && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Matching Products ({matchedProducts.length})</span>
              </div>

              {matchedProducts.length > 0 ? (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                  {matchedProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectProduct(p);
                        onClose();
                      }}
                      className="p-3.5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase">
                          <span className="text-blue-600 font-bold">{p.sectionId}</span>
                          <span>·</span>
                          <span>{p.category}</span>
                        </div>
                        <div className="text-xs font-bold text-zinc-900">{p.title}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-950 tabular-nums">
                        ${p.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-2">No matching products found.</div>
              )}
            </div>
          )}

          {q && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Matching Articles & Papers ({matchedArticles.length})</span>
              </div>

              {matchedArticles.length > 0 ? (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                  {matchedArticles.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        onNavigateSection(a.sectionId);
                        onClose();
                      }}
                      className="p-3.5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">
                          {a.sectionId} · {a.readTime}
                        </div>
                        <div className="text-xs font-bold text-zinc-900">{a.title}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-2">No matching articles found.</div>
              )}
            </div>
          )}

          {!q && (
            <div className="py-8 text-center text-zinc-400 text-xs">
              Type keywords above to instantly search across all nine technical sectors, vehicle specifications, and public market research documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
