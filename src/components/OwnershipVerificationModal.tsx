import React from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  CheckCircle2,
  Scale,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { VerificationRecord } from '../types';
import { VerificationBadge } from './VerificationBadge';

interface OwnershipVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: VerificationRecord;
  onOpenPolicy?: (type: 'privacy' | 'terms' | 'disclaimer') => void;
}

export const OwnershipVerificationModal: React.FC<OwnershipVerificationModalProps> = ({
  isOpen,
  onClose,
  record,
  onOpenPolicy,
}) => {
  if (!isOpen) return null;

  const isVerified = record.isVerified === true && record.status === 'verified';
  const isPending = record.status === 'pending_audit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-zinc-950 text-white border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-950/70 text-blue-400 border border-blue-800/80">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  Ownership & Authenticity Verification
                </h3>
                <VerificationBadge record={record} size="sm" />
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Official Independent Governance & Identity Record
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300 leading-relaxed">
          
          {/* Transparent Independent Platform Statement */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
            <div className="font-bold text-white flex items-center gap-2 mb-1.5">
              <Scale className="w-4 h-4 text-blue-400" />
              <span>Independent Platform Non-Affiliation Guarantee</span>
            </div>
            <p className="text-zinc-300">
              ELON MUSK SPACE is an independent technology catalog, space commerce directory, and market intelligence platform. 
              This website is <span className="text-white font-semibold underline decoration-blue-500">NOT owned, operated, authorized, or endorsed</span> by Elon Musk, SpaceX, Tesla Inc., Starlink, xAI, Neuralink, The Boring Company, or X Corp.
            </p>
          </div>

          {/* Verification Badge Status Card */}
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isVerified
                ? 'bg-blue-950/30 border-blue-800/80'
                : isPending
                ? 'bg-amber-950/20 border-amber-800/60'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div>
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                Official Verification Status
              </div>
              <div className="text-base font-extrabold text-white flex items-center gap-2">
                {isVerified ? (
                  <>
                    <span>Certified & Verified Owner</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </>
                ) : isPending ? (
                  <>
                    <span className="text-amber-300">Documentation Submitted — Audit In Progress</span>
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  </>
                ) : (
                  <span className="text-zinc-400">Awaiting Independent Validation</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {record.documentAuditNotes ||
                  'The blue verification badge is conditionally activated only upon authentic validation by an authorized independent verification registry.'}
              </p>
            </div>

            <div className="shrink-0">
              <VerificationBadge record={record} size="md" />
            </div>
          </div>

          {/* Legal Identity & Registry Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 font-mono text-zinc-400 text-[11px] uppercase pb-2 border-b border-zinc-800">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Operating Identity</span>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">LEGAL OWNER NAME</div>
                <div className="text-sm font-bold text-white">
                  {isVerified
                    ? record.legalOwnerName
                    : `${record.legalOwnerName || 'Stephen Sirrod'} (Audit In Progress)`}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">OPERATING ENTITY</div>
                <div className="text-xs text-zinc-200">
                  {record.operatingCompanyName || 'Independent Platform Administration & Media'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">REGISTRATION / FILING ID</div>
                <div className="text-xs font-mono text-zinc-300">
                  {record.companyRegistrationNumber || 'REG-PENDING-AUDIT-2026'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">JURISDICTION</div>
                <div className="text-xs text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  <span>{record.jurisdiction || 'United States & Global Cloud Operations'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 font-mono text-zinc-400 text-[11px] uppercase pb-2 border-b border-zinc-800">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Audit & Registry Provider</span>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">AUTHORIZED VERIFICATION PROVIDER</div>
                <div className="text-xs font-bold text-white">
                  {record.verificationProvider || 'Independent Third-Party Verification Authority'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">VERIFICATION DATE</div>
                <div className="text-xs font-mono text-zinc-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>{record.verificationDate || 'Audit in progress'}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">CERTIFICATE REFERENCE</div>
                <div className="text-xs font-mono text-zinc-300">
                  {record.certificateId || 'AUTH-VERIF-DOC-PENDING'}
                </div>
              </div>
              {record.verificationSourceUrl && (
                <div>
                  <div className="text-[10px] text-zinc-500 font-mono">REGISTRY SOURCE LINK</div>
                  <a
                    href={record.verificationSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-mono inline-flex items-center gap-1"
                  >
                    <span>View Public Registry Audit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* Official Contact & Legal Inquiries */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-2 font-mono text-zinc-400 text-[11px] uppercase mb-2">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Inquiries & Legal Documents</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-zinc-500 font-mono">Administration Email: </span>
                <a
                  href={`mailto:${record.officialContactEmail || 'sirrodstephen@gmail.com'}`}
                  className="font-bold text-white hover:text-blue-400 underline font-mono"
                >
                  {record.officialContactEmail || 'sirrodstephen@gmail.com'}
                </a>
              </div>

              {onOpenPolicy && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPolicy('disclaimer');
                    }}
                    className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    Disclaimer
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPolicy('privacy');
                    }}
                    className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    Privacy
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPolicy('terms');
                    }}
                    className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
                  >
                    Terms
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tamper-Resistant Security Notice */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-900">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Protected by Firestore Security Rules. Only authenticated administrator UID can write to verification records.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
