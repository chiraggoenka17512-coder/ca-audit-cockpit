import React, { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        const item = filtered[selectedIndex] || filtered[0];
        onSelectItem(item);
        onClose();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Universal Omni Search"
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
            onKeyDown={handleKeyDown}
          />
          <button 
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs px-1.5 py-0.5 rounded bg-obsidian-800 transition active:scale-95"
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
            filtered.map((item, idx) => {
              const isHighlighted = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSelectItem(item);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                    isHighlighted 
                      ? 'bg-obsidian-800 border border-emerald-500/40 text-neutral-100 ring-1 ring-emerald-500/20' 
                      : 'hover:bg-obsidian-800/80 text-neutral-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isHighlighted ? 'text-emerald-400' : 'text-neutral-200'}`}>
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
                    <CornerDownLeft className={`w-3.5 h-3.5 ${isHighlighted ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  </div>
                </div>
              );
            })
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
