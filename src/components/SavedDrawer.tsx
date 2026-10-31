import React from 'react';
import { X, Bookmark, Trash2, ArrowRight, MessageSquare } from 'lucide-react';
import { SavedItem, Product } from '../types';

interface SavedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedItem[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onRemoveSaved: (product: Product) => void;
  onOpenChat: (initialMessage?: string) => void;
}

export const SavedDrawer: React.FC<SavedDrawerProps> = ({
  isOpen,
  onClose,
  savedItems,
  products,
  onSelectProduct,
  onRemoveSaved,
  onOpenChat,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-zinc-900">Saved Items ({savedItems.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-950 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedItems.length > 0 ? (
            savedItems.map((item) => {
              const matchedProduct = products.find((p) => p.id === item.itemId);
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3 hover:border-zinc-300 transition-colors"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 rounded-lg object-cover bg-zinc-900 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-blue-600 font-mono uppercase font-bold">
                      {item.sectionId}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 truncate mb-1">{item.title}</h4>
                    {item.price && (
                      <div className="text-xs font-bold font-mono text-zinc-950 tabular-nums">
                        ${item.price.toLocaleString()}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {matchedProduct && (
                        <button
                          onClick={() => {
                            onSelectProduct(matchedProduct);
                            onClose();
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          View Details
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onOpenChat(`Inquiring about saved item: "${item.title}"`);
                          onClose();
                        }}
                        className="text-[11px] font-bold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" /> Inquire
                      </button>
                    </div>
                  </div>
                  {matchedProduct && (
                    <button
                      onClick={() => onRemoveSaved(matchedProduct)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-xs text-zinc-400">
              No saved items in this session. Bookmark products or technology articles using the bookmark icon on any card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
