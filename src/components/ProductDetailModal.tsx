import React, { useState } from 'react';
import { X, MessageSquare, Bookmark, Check, ShieldCheck, Truck, Zap, Share2 } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenChat: (initialMessage?: string) => void;
  onToggleSave: (product: Product) => void;
  isSaved: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenChat,
  onToggleSave,
  isSaved,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!product) return null;

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600';
  const images = product.images && product.images.length > 0
    ? product.images.map(img => img.startsWith('/src/assets') ? defaultPlaceholder : img)
    : [defaultPlaceholder];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInitiateChat = () => {
    onOpenChat();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-zinc-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span className="text-blue-600">{product.sectionId.toUpperCase()}</span>
            <span>·</span>
            <span>{product.category}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Share listing link"
            >
              <Share2 className="w-4 h-4" />
              {copiedLink && <span className="text-emerald-600 font-semibold">Copied!</span>}
            </button>

            <button
              onClick={() => onToggleSave(product)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isSaved ? 'text-amber-500 bg-amber-50' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60'
              }`}
              title="Save item"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Contiguous Purchase Module */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
          {/* Left: Gallery */}
          <div className="flex flex-col gap-4">
            <div className="aspect-4/3 rounded-xl overflow-hidden border border-zinc-200 flex items-center justify-center">
              <img
                src={images[selectedImageIndex] || defaultPlaceholder}
                alt={product.title}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  e.currentTarget.src = defaultPlaceholder;
                }}
                referrerPolicy="no-referrer"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImageIndex === i ? 'border-blue-600' : 'border-zinc-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = defaultPlaceholder;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Logistics & Security trust badges */}
            <div className="mt-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Delivery Estimate:{' '}
                  <strong className="text-zinc-900">{product.deliveryEstimate || 'Standard dispatch (1–3 weeks)'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Direct Allocation with Platform Dispatch Escrow</span>
              </div>
            </div>
          </div>

          {/* Right: Technical Specs & Contiguous Purchase Module */}
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-950 mb-2 leading-tight">
                {product.title}
              </h2>
              <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                {product.description}
              </p>

              {/* Price Callout */}
              <div className="mb-6 pb-6 border-b border-zinc-100">
                <span className="text-xs uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                  Direct Acquisition Price
                </span>
                <div className="text-3xl font-extrabold font-mono text-zinc-950 tabular-nums">
                  ${product.price.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  {product.inStock ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Available in Stock ({product.inventoryCount} units remaining)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      ● Priority Waitlist Reservation Tier
                    </span>
                  )}
                </div>
              </div>

              {/* Specifications Table */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                    Technical Specifications
                  </h4>
                  <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100 text-xs">
                    {Object.entries(product.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2.5 px-3.5 bg-white even:bg-zinc-50/50">
                        <span className="text-zinc-500 font-medium">{k}</span>
                        <span className="text-zinc-950 font-semibold font-mono tabular-nums text-right">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent CHAT ELON MUSK Inquiry Button */}
            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <button
                onClick={handleInitiateChat}
                className="w-full py-3.5 px-5 bg-black hover:bg-zinc-800 active:bg-zinc-900 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <MessageSquare className="w-5 h-5 text-white" />
                <span>MESSAGE ELON MUSK</span>
              </button>
              <p className="text-[11px] text-center text-zinc-500">
                Direct private conversation with Elon Musk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
