import React from 'react';
import { X, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

interface LegalPolicyModalProps {
  type: 'privacy' | 'terms' | 'disclaimer' | null;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm uppercase tracking-wide">
              {type === 'privacy' && 'Privacy Policy'}
              {type === 'terms' && 'Terms and Conditions'}
              {type === 'disclaimer' && 'Platform Disclaimer'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto text-xs text-zinc-700 leading-relaxed space-y-4">
          {type === 'disclaimer' && (
            <>
              <h4 className="font-bold text-sm text-zinc-950">1. Independent Status</h4>
              <p>
                ELON MUSK SPACE is an independent technology catalog and public intelligence platform. We are not an official branch, subsidiary, or affiliate of Elon Musk, Tesla Inc., Space Exploration Technologies Corp. (SpaceX), Starlink, xAI Corp., Neuralink Corp., The Boring Company, or X Corp.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">2. Public Market Transparency</h4>
              <p>
                All stock data, equity milestones, and financial ratios displayed in the Investment Information section are gathered from public securities filings and financial market indices. This information does not constitute investment advice, solicitations, or offers of private equity shares.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">3. Hardware & Inquiries</h4>
              <p>
                Product specifications, pricing estimates, and delivery manifests are compiled for global technology buyers and aerospace researchers. Inquiries initiated through &quot;Chat Elon Musk&quot; connect visitors with the platform administrative team.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">4. Ownership & Authenticity Verification</h4>
              <p>
                In compliance with strict governance standards, ELON MUSK SPACE maintains an independently verifiable ownership and corporate identity registry. The platform strictly prohibits fabricated endorsements, fake partnerships, or unauthorized claims of ownership. Official verification credentials and blue badges are granted only following independent validation by an authorized verification provider.
              </p>
            </>
          )}

          {type === 'privacy' && (
            <>
              <h4 className="font-bold text-sm text-zinc-950">Zero-Login Browsing Privacy</h4>
              <p>
                ELON MUSK SPACE is designed with strict zero-login principles. Visitors can browse all nine technical sections, read research publications, and explore equipment catalogs without submitting email addresses, passwords, or personal credentials.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">Anonymous Private Messaging</h4>
              <p>
                When you initiate a conversation via &quot;Chat Elon Musk&quot;, Firebase Anonymous Authentication generates an ephemeral session key. Your messages are stored in private Cloud Firestore collections and are inaccessible to any other marketplace visitor.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">No Third-Party Data Selling</h4>
              <p>
                We do not sell, rent, or trade visitor data or message histories to third parties or marketing networks.
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <h4 className="font-bold text-sm text-zinc-950">Terms of Service</h4>
              <p>
                By using ELON MUSK SPACE, you agree to access the catalog respectfully and adhere to safety standards. Harassment, abuse, or attempts to circumvent Firestore access rules will result in immediate session blocking.
              </p>
              <h4 className="font-bold text-sm text-zinc-950">Intellectual Property</h4>
              <p>
                All brand trademarks (Tesla, SpaceX, Starlink, xAI, Neuralink) remain the exclusive property of their respective trademark holders. Editorial and architectural designs are proprietary to ELON MUSK SPACE.
              </p>
            </>
          )}
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
