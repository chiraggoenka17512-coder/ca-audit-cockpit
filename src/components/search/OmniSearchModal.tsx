import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';
import { ExceptionItem } from '../queue/ExceptionQueue';
import { formatPaiseToINR } from '../../data/formatters';

interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExceptionItem[];
  onSelectItem: (item: ExceptionItem) => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter(item => {
    const q = query.toLowerCase();
    return (
      item.vendorName.toLowerCase().includes(q) ||
      item.vendorGstin.toLowerCase().includes(q) ||
      item.invoiceNumber.toLowerCase().includes(q) ||
      item.statutoryNote.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-xl rounded-xl bg-obsidian-900 border border-obsidian-700/80 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-obsidian-800 bg-obsidian-950">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find invoice... (e.g. 'Transport bill', 'INV-2024', 'Reliance')"
            className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) {
                onSelectItem(filtered[0]);
                onClose();
              }
            }}
          />
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs px-1.5 py-0.5 rounded bg-obsidian-800"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No matching invoices found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
                className="p-3 rounded-lg hover:bg-obsidian-800/80 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-400 transition">
                      {item.vendorName}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      #{item.invoiceNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {item.invoiceDate} • {item.statutoryNote}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-neutral-100">
                    {formatPaiseToINR(item.booksAmount)}
                  </span>
                  <CornerDownLeft className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-obsidian-800 bg-obsidian-950 flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>Navigate with ↑ ↓ • Select with ↵</span>
          <span>ReconOS Universal Omni-Search</span>
        </div>
      </div>
    </div>
  );
};
