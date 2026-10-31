import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Bookmark,
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import { InvestmentWatchlistItem } from '../types';
import {
  saveWatchlistItem,
  removeWatchlistItem,
  subscribeToWatchlist,
} from '../firebase/database';
import { ensureAnonymousAuth } from '../firebase/auth';

interface InvestmentHubViewProps {
  onOpenChat: (initialMessage?: string) => void;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: string;
  quarterlyDeliveries: string;
  energyDeployed: string;
}

const TSLA_DATA: StockQuote = {
  symbol: 'NASDAQ: TSLA',
  name: 'Tesla, Inc.',
  price: 258.45,
  change: 6.82,
  changePercent: 2.71,
  marketCap: '$824.5B',
  peRatio: '68.4x',
  quarterlyDeliveries: '498,000+ Vehicles',
  energyDeployed: '15.3 GWh / Quarter',
};

const FINANCIAL_MILESTONES = [
  { year: '2020', event: 'S&P 500 Inclusion & 5 Consecutive Profitable Quarters', revenue: '$31.5B' },
  { year: '2021', event: 'Gigafactory Shanghai Scale & Model Y Global Ramp', revenue: '$53.8B' },
  { year: '2022', event: 'Gigafactory Berlin & Austin Production Launch', revenue: '$81.5B' },
  { year: '2023', event: 'Model Y Becomes Best-Selling Car on Earth (1.2M units)', revenue: '$96.8B' },
  { year: '2024', event: 'Cybertruck High-Volume Ramp & Megapack Giga-scale', revenue: '$99.7B' },
  { year: '2025/2026', event: 'Autonomous Cybercab, Optimus Deployment & Memphis Colossus xAI', revenue: '$115B+ (Est.)' },
];

export const InvestmentHubView: React.FC<InvestmentHubViewProps> = ({ onOpenChat }) => {
  const [watchlist, setWatchlist] = useState<InvestmentWatchlistItem[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initUserWatchlist() {
      try {
        const user = await ensureAnonymousAuth();
        setUserId(user.uid);
        unsubscribe = subscribeToWatchlist(user.uid, (items) => {
          setWatchlist(items);
        });
      } catch (err) {
        console.warn('Watchlist auth warning:', err);
      }
    }
    initUserWatchlist();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newName.trim() || !userId) return;

    try {
      await saveWatchlistItem({
        id: '',
        userId,
        symbol: newSymbol.trim().toUpperCase(),
        name: newName.trim(),
        targetPrice: newTargetPrice ? parseFloat(newTargetPrice) : undefined,
        addedAt: new Date().toISOString(),
      });
      setNewSymbol('');
      setNewName('');
      setNewTargetPrice('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to save watchlist item:', err);
    }
  };

  const handleRemove = async (symbol: string) => {
    if (!userId) return;
    try {
      await removeWatchlistItem(userId, symbol);
    } catch (err) {
      console.error('Failed to remove watchlist item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Top Banner */}
      <div className="bg-zinc-950 text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest mb-2">
                <span>SECTION 09</span>
                <span>/</span>
                <span>PUBLIC EQUITY & RESEARCH INTELLIGENCE</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
                Investment Information & Public Markets
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
                Audited public disclosures, Tesla (NASDAQ: TSLA) financial architecture, historical automotive margins, energy storage deployment metrics, and personal watchlist indexing.
              </p>
            </div>

            <button
              onClick={() =>
                onOpenChat('I am inquiring about Tesla financial metrics and corporate intelligence.')
              }
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-extrabold text-sm rounded-xl shadow-md cursor-pointer transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4 text-black" />
              <span>MESSAGE ELON MUSK</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Mandatory Investor Legal Disclosure Callout */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold block mb-0.5">
              Investor Relations & Public Market Integrity Disclosure
            </strong>
            ELON MUSK SPACE provides verified public-market research, financial filings, and educational data for educational purposes. We do not provide personalized financial, tax, or investment advice, nor do we promise guaranteed returns or offer private-market pre-IPO shares. All equity trading involves risk of capital loss. Verify all information via official SEC Edgar filings.
          </div>
        </div>

        {/* Live Tesla (NASDAQ: TSLA) Metric Dashboard */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-100 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-mono font-medium">
                {TSLA_DATA.symbol}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950">
                {TSLA_DATA.name}
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-zinc-950 tabular-nums">
                ${TSLA_DATA.price.toFixed(2)}
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-emerald-600 mt-1 font-mono">
                <ArrowUpRight className="w-4 h-4" />
                <span>+${TSLA_DATA.change.toFixed(2)} (+{TSLA_DATA.changePercent}%)</span>
                <span className="text-zinc-400 font-normal">Today</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-zinc-700">
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-medium">Market Capitalization</span>
              <span className="text-lg font-bold font-mono text-zinc-950 tabular-nums">{TSLA_DATA.marketCap}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-medium">Price / Earnings (TTM)</span>
              <span className="text-lg font-bold font-mono text-zinc-950 tabular-nums">{TSLA_DATA.peRatio}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-medium">Quarterly Deliveries</span>
              <span className="text-lg font-bold font-mono text-zinc-950 tabular-nums">{TSLA_DATA.quarterlyDeliveries}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider block font-medium">Energy Storage Scale</span>
              <span className="text-lg font-bold font-mono text-zinc-950 tabular-nums">{TSLA_DATA.energyDeployed}</span>
            </div>
          </div>
        </div>

        {/* Historical Production & Financial Progression */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-950">
                Audited Financial Milestones & Revenue Scale
              </h3>
              <p className="text-xs text-zinc-500">
                Official historical revenue progression and multi-year manufacturing ramps.
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Fiscal Year</th>
                  <th className="py-3 px-4">Key Industrial & Product Milestone</th>
                  <th className="py-3 px-4 text-right">Annual Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {FINANCIAL_MILESTONES.map((m) => (
                  <tr key={m.year} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{m.year}</td>
                    <td className="py-3.5 px-4 text-zinc-700">{m.event}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-right text-zinc-950 tabular-nums">
                      {m.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Personal Investor Watchlist (Firestore Persistent) */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-950">
                Personal Investment Watchlist
              </h3>
              <p className="text-xs text-zinc-500">
                Track assets and target prices. Saved directly in your persistent Firestore profile.
              </p>
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ticker</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAddWatchlist} className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Ticker Symbol (e.g. TSLA)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Asset Name (e.g. Tesla Inc)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Target Price (USD)"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  className="px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 cursor-pointer"
                >
                  Save to Watchlist
                </button>
              </div>
            </form>
          )}

          {watchlist.length > 0 ? (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
              {watchlist.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div>
                    <span className="font-mono font-bold text-sm text-zinc-900 mr-2">{item.symbol}</span>
                    <span className="text-xs text-zinc-500">{item.name}</span>
                    {item.targetPrice && (
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Target Price: <strong className="text-zinc-800 font-mono">${item.targetPrice}</strong>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onOpenChat(`Investor research inquiry regarding watchlist ticker: ${item.symbol}`)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      Inquire
                    </button>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-500">
              No custom tickers added yet. Click &ldquo;Add Ticker&rdquo; above to track specific technology assets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
