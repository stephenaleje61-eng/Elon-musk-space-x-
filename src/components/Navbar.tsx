import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Bookmark,
  ShieldCheck,
  Menu,
  X,
  User,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { SectionId, VerificationRecord } from '../types';
import { VerificationBadge } from './VerificationBadge';

interface NavbarProps {
  activeSection: SectionId | 'home' | 'investment-hub' | 'admin' | 'verification';
  onNavigate: (section: SectionId | 'home' | 'investment-hub' | 'admin' | 'verification') => void;
  onOpenChat: (initialMessage?: string) => void;
  onOpenSearch: () => void;
  savedCount: number;
  onOpenSavedDrawer: () => void;
  isAdmin: boolean;
  userEmail?: string | null;
  onLogout: () => void;
  onOpenAdminAuth: () => void;
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
  isAdmin,
  userEmail,
  onLogout,
  onOpenAdminAuth,
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
            <span className="hidden sm:inline text-zinc-400">Independent Technology Index & Marketplace</span>
            <span className="sm:hidden text-zinc-400">Independent Catalog</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 hidden md:inline">Zero-Login Global Access</span>
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

      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          onClick={() => {
            onNavigate('home');
            setMobileMenuOpen(false);
          }}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-950 group-hover:text-blue-600 transition-colors whitespace-nowrap shrink-0">
            ELON MUSK SPACE
          </span>
        </button>

        {/* Zone 2: 4–5 Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-600">
          <button
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'home' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => onNavigate('tesla')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'tesla' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Tesla & Energy
          </button>
          <button
            onClick={() => onNavigate('spacex')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'spacex' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            SpaceX & Rockets
          </button>
          <button
            onClick={() => onNavigate('robotics')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'robotics' ? 'text-zinc-950 font-semibold' : ''
            }`}
          >
            Optimus Robotics
          </button>
          <button
            onClick={() => onNavigate('investment-hub')}
            className={`whitespace-nowrap transition-colors hover:text-zinc-950 cursor-pointer ${
              activeSection === 'investment-hub' || activeSection === 'investment'
                ? 'text-zinc-950 font-semibold'
                : ''
            }`}
          >
            Investment Info
          </button>

          {/* Ownership & Authenticity Verification Link */}
          <button
            onClick={onOpenVerification}
            className="whitespace-nowrap flex items-center gap-1.5 transition-colors hover:text-blue-600 text-zinc-600 cursor-pointer font-medium text-xs sm:text-sm"
            title="Official Ownership & Authenticity Verification Registry"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verification</span>
          </button>

          {/* Private Admin Dashboard Entry in Navigation */}
          <button
            onClick={() => {
              if (isAdmin) {
                onNavigate('admin');
              } else {
                onOpenAdminAuth();
              }
            }}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'admin'
                ? 'bg-zinc-950 text-white shadow-xs'
                : isAdmin
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            title={isAdmin ? "Open Authorized Admin Dashboard" : "Administrator Portal (Website Owner)"}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-500' : 'text-zinc-400'}`} />
            <span>{isAdmin ? 'Admin Dashboard' : 'Admin'}</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Quick Utilities */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Search catalog"
            title="Search products and articles"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Bookmarks / Saved */}
          <button
            onClick={onOpenSavedDrawer}
            className="relative p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Saved items"
            title="View saved items"
          >
            <Bookmark className="w-4 h-4" />
            {savedCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-zinc-950 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {savedCount}
              </span>
            )}
          </button>

          {/* Private Admin Portal Icon Button */}
          <button
            onClick={() => {
              if (isAdmin) {
                onNavigate('admin');
              } else {
                onOpenAdminAuth();
              }
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'admin'
                ? 'bg-zinc-950 text-white'
                : isAdmin
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-semibold'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            aria-label="Admin Dashboard"
            title={isAdmin ? "Open Admin Dashboard (Authenticated)" : "Admin Portal (Website Owner)"}
          >
            <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-emerald-600' : 'text-zinc-600'}`} />
            <span className="hidden xl:inline text-xs font-semibold">
              {isAdmin ? 'Dashboard' : 'Admin'}
            </span>
          </button>

          {/* Primary Action Button: MESSAGE ELON MUSK */}
          <button
            onClick={() => onOpenChat()}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-white bg-black hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-800 shadow-sm rounded-lg transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-white" />
            <span>MESSAGE ELON MUSK</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
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
              1. Tesla & Clean Energy
            </button>
            <button
              onClick={() => {
                onNavigate('robotics');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              2. Robots & Robotics (Optimus)
            </button>
            <button
              onClick={() => {
                onNavigate('spacex');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800"
            >
              3. Space & Rockets (SpaceX)
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
              8. X Platform & Communications
            </button>
            <button
              onClick={() => {
                onNavigate('investment-hub');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 text-zinc-800 font-semibold text-blue-600"
            >
              9. Investment Information & Stock
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-200 space-y-2">
            {/* Private Admin Dashboard Mobile Link */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (isAdmin) {
                  onNavigate('admin');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeSection === 'admin'
                  ? 'bg-zinc-950 text-white'
                  : isAdmin
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-emerald-600' : 'text-zinc-600'}`} />
                <span>{isAdmin ? 'Admin Dashboard (Active)' : 'Admin Dashboard (Owner Portal)'}</span>
              </span>
              {isAdmin && (
                <span className="text-[10px] font-mono uppercase bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
                  Authorized
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onOpenChat();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 text-center text-sm font-extrabold text-white bg-black rounded-lg hover:bg-zinc-800"
            >
              MESSAGE ELON MUSK
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
