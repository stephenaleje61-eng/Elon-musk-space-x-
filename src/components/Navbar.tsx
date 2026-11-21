import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Bookmark,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { SectionId, VerificationRecord } from '../types';
import { VerificationBadge } from './VerificationBadge';

interface NavbarProps {
  activeSection: SectionId | 'home' | 'investment-hub' | 'verification' | 'chat' | 'recipient-inbox';
  onNavigate: (section: SectionId | 'home' | 'investment-hub' | 'verification' | 'chat') => void;
  onOpenChat: (initialMessage?: string) => void;
  onOpenSearch: () => void;
  savedCount: number;
  onOpenSavedDrawer: () => void;
  verificationRecord?: VerificationRecord | null;
  onOpenVerification?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenChat,
  onOpenSearch,
  savedCount,
  onOpenSavedDrawer,
  verificationRecord,
  onOpenVerification,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      {/* Top Notification & Independent Disclaimer Bar */}
      <div className="bg-zinc-950 text-zinc-300 text-xs py-1.5 px-4 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate text-[11px] sm:text-xs">
            <span className="font-extrabold text-white">ELON MUSK SPACE</span>
            <span className="text-zinc-500">·</span>
            <span className="hidden sm:inline text-zinc-400">Independent Technology Index &amp; Marketplace</span>
            <span className="sm:hidden text-zinc-400">Independent Catalog</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 hidden md:inline">Zero-Login Direct Private Chat</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {verificationRecord && (
              <VerificationBadge
                record={verificationRecord}
                size="sm"
                onClick={onOpenVerification}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3-Zone Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            onNavigate('home');
            setMobileMenuOpen(false);
          }}
          className="text-left group cursor-pointer focus:outline-none min-w-0"
        >
          <span className="text-sm sm:text-xl font-extrabold tracking-tight text-zinc-950 group-hover:text-blue-600 transition-colors whitespace-nowrap shrink-0">
            ELON MUSK SPACE
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-600">
          <button
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'home' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => onNavigate('tesla')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'tesla' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Tesla &amp; Energy
          </button>
          <button
            onClick={() => onNavigate('spacex')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'spacex' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            SpaceX &amp; Rockets
          </button>
          <button
            onClick={() => onNavigate('robotics')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'robotics' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Optimus Robotics
          </button>
          <button
            onClick={() => onNavigate('investment-hub')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'investment-hub' || activeSection === 'investment'
                ? 'text-zinc-950 font-semibold'
                : ''
            }`}
          >
            Investment Info
          </button>

          <button
            onClick={onOpenVerification}
            className="whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors hover:text-blue-600 text-zinc-600 cursor-pointer font-medium text-xs sm:text-sm"
            title="Official Ownership & Authenticity Verification Registry"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verification</span>
          </button>
        </nav>

        {/* Zone 3: Quick Utilities + Direct Private Chat CTA */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenSearch}
            className="p-1.5 sm:p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Search catalog"
            title="Search products and articles"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSavedDrawer}
            className="relative p-1.5 sm:p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Saved items"
            title="View saved items"
          >
            <Bookmark className="w-4 h-4" />
            {savedCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-zinc-950 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {savedCount}
              </span>
            )}
          </button>

          {/* Primary Action Button: DIRECT PRIVATE CHAT */}
          <button
            onClick={() => onOpenChat()}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              activeSection === 'chat'
                ? 'bg-cyan-400 text-black border-cyan-300 shadow-sm'
                : 'bg-black hover:bg-zinc-900 text-white border-cyan-500/40 shadow-sm'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeSection === 'chat' ? 'text-black' : 'text-cyan-400'}`} />
            <span className="sm:hidden">PRIVATE CHAT</span>
            <span className="hidden sm:inline">DIRECT PRIVATE CHAT</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Zero Admin Links) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-3 py-1">
            Browse All 9 Sections
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm font-medium">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              Marketplace Homepage
            </button>
            <button
              onClick={() => {
                onNavigate('tesla');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              1. Tesla &amp; Clean Energy
            </button>
            <button
              onClick={() => {
                onNavigate('robotics');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              2. Robots &amp; Robotics (Optimus)
            </button>
            <button
              onClick={() => {
                onNavigate('spacex');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              3. Space &amp; Rockets (SpaceX)
            </button>
            <button
              onClick={() => {
                onNavigate('starlink');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              4. Starlink Satellite Internet
            </button>
            <button
              onClick={() => {
                onNavigate('xai');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              5. Artificial Intelligence (xAI)
            </button>
            <button
              onClick={() => {
                onNavigate('neuralink');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              6. Neuralink BCI
            </button>
            <button
              onClick={() => {
                onNavigate('boring');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              7. The Boring Company
            </button>
            <button
              onClick={() => {
                onNavigate('x');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              8. X Platform &amp; Communications
            </button>
            <button
              onClick={() => {
                onNavigate('investment-hub');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-blue-600 font-semibold"
            >
              9. Investment Information &amp; Stock
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-200">
            <button
              onClick={() => {
                onOpenChat();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 text-center text-sm font-extrabold text-black bg-gradient-to-r from-cyan-400 to-blue-600 rounded-lg cursor-pointer"
            >
              ELON MUSK – DIRECT PRIVATE CHAT
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
