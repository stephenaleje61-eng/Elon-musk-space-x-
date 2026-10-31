import React from 'react';
import { SECTIONS } from '../data/sections';
import { SectionId } from '../types';

interface NineSectionsBarProps {
  activeSection: SectionId | 'home' | 'investment-hub' | 'admin';
  onSelectSection: (id: SectionId) => void;
}

export const NineSectionsBar: React.FC<NineSectionsBarProps> = ({
  activeSection,
  onSelectSection,
}) => {
  return (
    <div className="bg-white border-b border-zinc-200 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar scroll-smooth">
          {SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => onSelectSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950'
                }`}
              >
                <span className={`font-mono text-[10px] ${isSelected ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {sec.number}
                </span>
                <span>{sec.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
