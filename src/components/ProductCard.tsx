import React from 'react';
import { Bookmark, MessageSquare, ArrowUpRight } from 'lucide-react';
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
  // Support product.image, product.images, or specific category defaults
  const getProductImage = (p: Product): string => {
    const rawImage = (p as any).image || (p.images && p.images[0]);
    if (rawImage && !rawImage.startsWith('/src/assets')) {
      return rawImage;
    }
    // Section-specific high-quality Unsplash fallbacks
    if (p.sectionId === 'spacex' || p.category?.toLowerCase().includes('starship') || p.title?.toLowerCase().includes('starship')) {
      return 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=600';
    }
    if (p.sectionId === 'starlink' || p.title?.toLowerCase().includes('starlink')) {
      return 'https://images.unsplash.com/photo-1495578942200-c5f5d7af99d3?w=600';
    }
    if (p.sectionId === 'tesla' || p.title?.toLowerCase().includes('tesla') || p.title?.toLowerCase().includes('cybertruck')) {
      return 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600';
    }
    if (p.sectionId === 'robotics' || p.title?.toLowerCase().includes('optimus')) {
      return 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600';
    }
    if (p.sectionId === 'xai') {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';
    }
    if (p.sectionId === 'neuralink') {
      return 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600';
    }
    if (p.sectionId === 'boring') {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600';
    }
    if (p.sectionId === 'x') {
      return 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600';
    }
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600';
  };

  const primaryImage = getProductImage(product);
  const productName = (product as any).name || product.title;

  const formatPrice = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="bg-[#111] rounded-xl overflow-hidden border border-zinc-800 flex flex-col group hover:border-zinc-700 hover:shadow-xl transition-all duration-200">
      {/* Product Image Area - No black background behind image, no bg-black */}
      <div
        onClick={() => onSelect(product)}
        className="relative overflow-hidden cursor-pointer"
      >
        <img
          src={primaryImage}
          alt={productName}
          className="w-full h-[200px] object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600';
          }}
          referrerPolicy="no-referrer"
        />

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
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-zinc-950/80 backdrop-blur-md rounded text-[11px] font-medium text-emerald-400 border border-emerald-900/40">
            In Stock · {product.inventoryCount} units
          </div>
        ) : (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-zinc-950/80 backdrop-blur-md rounded text-[11px] font-medium text-amber-400 border border-amber-900/40">
            Reservation Waitlist
          </div>
        )}
      </div>

      {/* Card Content Area: p-4 product info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium mb-1.5 uppercase tracking-wider">
            <span className="text-blue-400 font-semibold">{product.sectionId}</span>
            <span aria-hidden="true">·</span>
            <span>{product.category}</span>
          </div>

          <h3
            onClick={() => onSelect(product)}
            className="text-base font-bold text-white hover:text-blue-400 transition-colors cursor-pointer line-clamp-1 mb-1.5"
          >
            {productName}
          </h3>

          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
            {product.subtitle || product.description}
          </p>
        </div>

        <div>
          {/* Price & Primary Inquiry Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase tracking-wider">Pricing / Allocation</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onQuickChat(product)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-blue-500/30"
                title="Inquire via private chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inquire</span>
              </button>

              <button
                onClick={() => onSelect(product)}
                className="p-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors cursor-pointer"
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
