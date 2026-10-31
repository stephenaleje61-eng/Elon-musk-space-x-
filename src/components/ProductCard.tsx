import React, { useState } from 'react';
import { Bookmark, MessageSquare, ArrowUpRight, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onToggleSave: (product: Product) => void;
  isSaved: boolean;
  onQuickChat: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onToggleSave,
  isSaved,
  onQuickChat,
}) => {
  const [imageError, setImageError] = useState(false);
  const primaryImage = product.images?.[0] || '/src/assets/images/hero_elon_musk_space_1793378963159.jpg';

  const formatPrice = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="group bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col hover:border-zinc-300 hover:shadow-lg transition-all duration-200">
      {/* Product Image Area */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-4/3 bg-zinc-900 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {!imageError ? (
          <img
            src={primaryImage}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-zinc-400">
            <span className="text-xs uppercase tracking-widest text-blue-400 font-mono mb-1">
              {product.sectionId.toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-zinc-200">{product.title}</span>
          </div>
        )}

        {/* Save/Bookmark Top Right Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(product);
          }}
          className={`absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
            isSaved
              ? 'bg-zinc-950 text-amber-400'
              : 'bg-zinc-950/60 text-white hover:bg-zinc-950/90'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
          title={isSaved ? 'Saved to bookmarks' : 'Save to bookmarks'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Subtle Inventory Tag in Top Left */}
        {product.inStock ? (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-zinc-950/80 backdrop-blur-md rounded text-[11px] font-medium text-emerald-400">
            In Stock · {product.inventoryCount} units
          </div>
        ) : (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-zinc-950/80 backdrop-blur-md rounded text-[11px] font-medium text-amber-400">
            Reservation Waitlist
          </div>
        )}
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Zero-Pill Unboxed Metadata with Typographic Separator */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">
            <span className="text-blue-600 font-semibold">{product.sectionId}</span>
            <span aria-hidden="true">·</span>
            <span>{product.category}</span>
          </div>

          <h3
            onClick={() => onSelect(product)}
            className="text-base font-bold text-zinc-950 hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 mb-1.5"
          >
            {product.title}
          </h3>

          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4">
            {product.subtitle || product.description}
          </p>
        </div>

        <div>
          {/* Price & Primary Inquiry Actions */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-zinc-400 block">Pricing / Allocation</span>
              <span className="text-lg font-bold text-zinc-950 font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onQuickChat(product)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Inquire via private chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inquire</span>
              </button>

              <button
                onClick={() => onSelect(product)}
                className="p-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg transition-colors cursor-pointer"
                title="View full specifications"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
