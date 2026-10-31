import React from 'react';
import { ShieldAlert, ArrowUpRight, MessageSquare, Globe, Heart } from 'lucide-react';
import { SECTIONS } from '../data/sections';
import { SectionId } from '../types';

interface FooterProps {
  onNavigateSection: (sectionId: SectionId) => void;
  onOpenChat: (initialMessage?: string) => void;
  onOpenPolicy: (type: 'privacy' | 'terms' | 'disclaimer') => void;
  onOpenAdminAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateSection,
  onOpenChat,
  onOpenPolicy,
  onOpenAdminAuth,
}) => {
  return (
    <footer className="bg-zinc-950 text-white border-t border-zinc-800">
      {/* Top CTA Row */}
      <div className="border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-1">
              ELON MUSK SPACE DISPATCH
            </h3>
            <p className="text-xs text-zinc-400">
              Direct encrypted communication line to the platform administrative command.
            </p>
          </div>

          <button
            onClick={() => onOpenChat()}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 text-black" />
            <span>MESSAGE ELON MUSK</span>
          </button>
        </div>
      </div>

      {/* Nine Sections Link Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
              Vehicle & Energy
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={() => onNavigateSection('tesla')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Tesla Cars & Energy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('tesla')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Cybertruck & Plaid
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('tesla')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Powerwall & Solar
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
              Robotics & AI
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={() => onNavigateSection('robotics')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Optimus Humanoid Robots
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('xai')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  xAI & Grok Supercluster
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('neuralink')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Neuralink Interfaces
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
              Space & Orbital
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={() => onNavigateSection('spacex')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  SpaceX & Starship
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('starlink')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Starlink Internet
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('spacex')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Falcon 9 & Dragon
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
              Infrastructure & Public
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={() => onNavigateSection('boring')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  The Boring Company
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('x')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  X Platform & Comms
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('investment')}
                  className="hover:text-white transition-colors cursor-pointer text-left font-semibold text-emerald-400"
                >
                  Investment Hub (TSLA)
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5 */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
              Platform & Legal
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={() => onOpenPolicy('disclaimer')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Platform Disclaimer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('privacy')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('terms')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              {onOpenAdminAuth && (
                <li>
                  <button
                    onClick={onOpenAdminAuth}
                    className="text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer text-left flex items-center gap-1 text-[11px]"
                  >
                    <span>Admin Control Console</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Clear Independent Platform Disclaimer as required in Prompt #5 */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-8 leading-relaxed">
          <div className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span>Independent Platform Statement</span>
          </div>
          ELON MUSK SPACE is an independent technology catalog, space commerce index, and market intelligence platform. This website is NOT officially operated, owned, or endorsed by Elon Musk, Tesla Inc., SpaceX, Starlink, xAI, Neuralink, The Boring Company, or X Corp. All brand names, trademarks, and registered logos remain the property of their respective holders.
        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 pt-6 border-t border-zinc-900 gap-4">
          <div>
            © {new Date().getFullYear()} ELON MUSK SPACE. Global Technology Marketplace & Intelligence Index.
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Firebase Modular SDK & Firestore</span>
            <span>·</span>
            <span>Zero-Login Public Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
