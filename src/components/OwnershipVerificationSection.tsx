import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Building2,
  Calendar,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  FileText,
} from 'lucide-react';
import { VerificationRecord } from '../types';
import { VerificationBadge } from './VerificationBadge';

interface OwnershipVerificationSectionProps {
  record: VerificationRecord;
  onOpenPolicy?: (type: 'privacy' | 'terms' | 'disclaimer') => void;
  onOpenAdminAuth?: () => void;
  isAdmin?: boolean;
}

export const OwnershipVerificationSection: React.FC<OwnershipVerificationSectionProps> = ({
  record,
  onOpenPolicy,
  onOpenAdminAuth,
  isAdmin,
}) => {
  const isVerified = record.isVerified === true && record.status === 'verified';
  const isPending = record.status === 'pending_audit';

  return (
    <section id="ownership-verification" className="bg-zinc-950 text-white border-t border-zinc-800 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading & Identification Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-zinc-800/80 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-blue-400 uppercase tracking-widest font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>GOVERNANCE & AUTHENTICITY DISCLOSURE</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Official Ownership & Verification Registry
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Transparent, independently verifiable disclosure of platform legal ownership, operating entities, official registration records, and third-party audit credentials.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <VerificationBadge record={record} size="lg" />
          </div>
        </div>

        {/* Mandatory Non-Affiliation and Authenticity Notice */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-10 leading-relaxed shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/60 shrink-0 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Authentic Identity & Non-Affiliation Standard</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                <strong className="text-white">ELON MUSK SPACE</strong> is an independent technology catalog, space commerce directory, and public market index. 
                This platform is <span className="underline decoration-blue-500 font-semibold text-white">NOT owned, operated, authorized, or endorsed</span> by Elon Musk, Tesla, Inc., SpaceX (Space Exploration Technologies Corp.), Starlink, xAI Corp., Neuralink Corp., The Boring Company, or X Corp. 
                All trademarks, product names, logos, and patents referenced across all nine catalog sections remain the registered property of their respective legal corporate holders.
              </p>
              <p className="text-zinc-400 text-[11px] font-mono">
                Independent Platform Policy: No endorsements, executive sponsorships, or unauthorized partnerships are ever claimed or fabricated.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Dossier Grid: Ownership Identity / Verification Status / Official Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          
          {/* Column 1: Website Identity & Operating Legal Entity */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4 pb-3 border-b border-zinc-800">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Operating Legal Identity</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Verified Legal Owner
                  </div>
                  <div className="text-base font-extrabold text-white flex items-center gap-2">
                    {isVerified ? (
                      <>
                        <span>{record.legalOwnerName}</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      </>
                    ) : (
                      <span className="text-zinc-300 font-medium">
                        {record.legalOwnerName || 'Submitted to Auditor · Validation Pending'}
                      </span>
                    )}
                  </div>
                  {!isVerified && (
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                      (Owner name publicly certified upon completion of third-party documentation audit)
                    </p>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Operating Entity
                  </div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {record.operatingCompanyName || 'Independent Platform Administration & Media'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Entity Registration / Filing ID
                  </div>
                  <div className="text-xs font-mono text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 inline-block">
                    {record.companyRegistrationNumber || 'REG-PENDING-AUDIT-2026'}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Jurisdiction of Operation
                  </div>
                  <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{record.jurisdiction || 'United States & Global Cloud Operations'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tamper-Resistant Firestore Security Rules Protected</span>
            </div>
          </div>

          {/* Column 2: Verification Badge & Independent Audit Status */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-400" />
                  <span>Independent Audit Status</span>
                </div>
                <VerificationBadge record={record} size="sm" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Authorized Verification Provider
                  </div>
                  <div className="text-sm font-bold text-white">
                    {record.verificationProvider || 'Independent Third-Party Verification Authority'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                      Verification Date
                    </div>
                    <div className="text-xs font-mono text-zinc-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{record.verificationDate || 'Audit in progress'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                      Certificate ID
                    </div>
                    <div className="text-xs font-mono text-zinc-300 truncate" title={record.certificateId}>
                      {record.certificateId || 'AUTH-PENDING-2026'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Documentation Review Status
                  </div>
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      isVerified
                        ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                        : isPending
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          <span>Officially Validated & Certified</span>
                        </>
                      ) : (
                        <>
                          <Info className="w-4 h-4 text-amber-400" />
                          <span>Documentation Review In Progress</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px]">
                      {record.documentAuditNotes ||
                        'Authentic ownership documentation submitted to independent validation provider. Blue verification badge renders once certified.'}
                    </p>
                  </div>
                </div>

                {record.verificationSourceUrl && (
                  <div>
                    <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                      Registry Audit Source
                    </div>
                    <a
                      href={record.verificationSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-mono underline break-all"
                    >
                      <span>Public Verification Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono">
              Last status refresh: {new Date(record.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Column 3: Official Contact & Legal Inquiries */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4 pb-3 border-b border-zinc-800">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Official Contact & Legal Documents</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Official Administration Email
                  </div>
                  <a
                    href={`mailto:${record.officialContactEmail || 'sirrodstephen@gmail.com'}`}
                    className="text-sm font-semibold text-white hover:text-blue-400 transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span>{record.officialContactEmail || 'sirrodstephen@gmail.com'}</span>
                  </a>
                </div>

                {record.officialSupportPhone && (
                  <div>
                    <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                      Dispatch Support Hotline
                    </div>
                    <div className="text-xs text-zinc-300 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{record.officialSupportPhone}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Registered Operating Address
                  </div>
                  <div className="text-xs text-zinc-400 leading-relaxed">
                    {record.registeredAddress ||
                      'Independent Administrative Command, Austin, TX & Global Distributed Server Network'}
                  </div>
                </div>

                {/* Legal Documents Direct Links */}
                <div>
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-2">
                    Official Legal Policies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onOpenPolicy && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenPolicy('disclaimer')}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>Disclaimer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPolicy('privacy')}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>Privacy Policy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPolicy('terms')}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>Terms of Service</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && onOpenAdminAuth && (
              <div className="pt-6 mt-6 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={onOpenAdminAuth}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Update Verification in Admin Dashboard</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* 4-Step Verification Audit Standards Protocol */}
        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/60 p-6 sm:p-8">
          <h3 className="text-base font-extrabold text-white mb-2 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            <span>Independent Verification & Governance Standard</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            To ensure zero deception and strictly prevent fabricated endorsements, this platform adheres to a 4-pillar authenticity protocol:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="font-mono text-blue-400 font-bold mb-1">01 · IDENTITY AUDIT</div>
              <div className="font-bold text-white mb-1">Legal Owner Validation</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Government-issued photo identification and legal corporate registration verified by an authorized third-party registry.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="font-mono text-blue-400 font-bold mb-1">02 · TECHNICAL PROOF</div>
              <div className="font-bold text-white mb-1">Infrastructure Control</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Cryptographic authentication via Firebase Auth UID and Cloud Firestore access rules with zero anonymous administrative rights.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="font-mono text-blue-400 font-bold mb-1">03 · BLUE BADGE CRITERIA</div>
              <div className="font-bold text-white mb-1">Authorized Provider Seal</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                The blue verification badge is conditionally activated only when legitimate third-party audit documentation is validated.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="font-mono text-blue-400 font-bold mb-1">04 · ZERO SLOP / INTEGRITY</div>
              <div className="font-bold text-white mb-1">Non-Affiliation Compliance</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Permanent transparent disclosures confirming this platform is an independent catalog and not endorsed by Elon Musk.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
