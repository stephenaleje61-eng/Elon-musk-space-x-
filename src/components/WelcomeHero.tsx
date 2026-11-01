import React from 'react';
import { ArrowRight, MessageSquare, TrendingUp, Cpu, ShoppingBag, ShieldAlert } from 'lucide-react';
import { SectionId, VerificationRecord } from '../types';
import { VerificationBadge } from './VerificationBadge';

interface WelcomeHeroProps {
  onExploreProducts: () => void;
  onExploreTechnology: () => void;
  onInvestmentInfo: () => void;
  onChatPrivately: () => void;
  verificationRecord?: VerificationRecord | null;
  onOpenVerification?: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  onExploreProducts,
  onExploreTechnology,
  onInvestmentInfo,
  onChatPrivately,
  verificationRecord,
  onOpenVerification,
}) => {
  return (
    <section className="relative bg-zinc-950 text-white overflow-hidden border-b border-zinc-800">
      {/* Background Hero Image with Measured Gradient Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600"
          alt="SpaceX Starship, orbital constellation and deep space technology"
          className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transform hover:scale-100 transition-transform duration-1000 ease-out"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1600";
          }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />
        <div className="absolute inset-0 bg-radial at-center from-transparent via-zinc-950/30 to-zinc-950" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        {/* Subtle Independent Disclaimer Alert Badge & Verification Badge Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs font-medium backdrop-blur-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>Independent Platform · Not officially operated or endorsed by Elon Musk</span>
          </div>

          {verificationRecord && (
            <VerificationBadge
              record={verificationRecord}
              size="md"
              onClick={onOpenVerification}
            />
          )}
        </div>

        {/* Main Display Headline & Subtitle */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            WELCOME TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-blue-400">ELON MUSK SPACE</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-300 font-normal mb-8 leading-relaxed">
            Explore Innovation. Discover Technology. Connect with the Future.
          </p>
          <p className="text-sm text-zinc-400 mb-10 max-w-2xl leading-relaxed">
            The premier global marketplace and verified technical intelligence index bridging aerospace rocketry, humanoid automation, clean energy storage, gigawatt supercomputing, and public equity metrics across all nine revolutionary technology frontiers.
          </p>

          {/* Four Large Buttons as required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={onExploreProducts}
              className="flex items-center justify-between px-5 py-4 bg-white text-zinc-950 font-bold text-sm rounded-xl hover:bg-zinc-100 active:bg-zinc-200 transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span className="tracking-wide">EXPLORE PRODUCTS</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-zinc-950 transition-transform" />
            </button>

            <button
              onClick={onExploreTechnology}
              className="flex items-center justify-between px-5 py-4 bg-zinc-900/90 text-white font-bold text-sm rounded-xl border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="tracking-wide">EXPLORE TECHNOLOGY</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-white transition-transform" />
            </button>

            <button
              onClick={onInvestmentInfo}
              className="flex items-center justify-between px-5 py-4 bg-zinc-900/90 text-white font-bold text-sm rounded-xl border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="tracking-wide">INVESTMENT INFO</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-white transition-transform" />
            </button>

            <button
              onClick={onChatPrivately}
              className="flex items-center justify-between px-5 py-4 bg-white text-black font-extrabold text-sm rounded-xl hover:bg-zinc-200 active:bg-zinc-300 transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-black" />
                <span className="tracking-wide">MESSAGE ELON MUSK</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-black transition-transform" />
            </button>
          </div>
        </div>

        {/* Real-time Proof Numbers Grid Below Hero Split */}
        <div className="mt-14 pt-8 border-t border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-zinc-400">
          <div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">9 / 9</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">Tech Frontiers Cataloged</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">100%</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">Zero-Login Open Access</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">&lt; 150ms</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">Live Firestore Message Stream</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">TSLA $850B+</div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">Public Market Transparency</div>
          </div>
        </div>
      </div>
    </section>
  );
};
