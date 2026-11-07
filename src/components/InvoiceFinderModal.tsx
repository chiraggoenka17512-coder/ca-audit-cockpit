import React, { useState, useEffect, useRef } from 'react';
import { ReviewItem } from '../data/reviewItems';
import { ClientProfile } from '../data/clientDatabases';
import { Search, X, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';

interface InvoiceFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReviewItem[];
  client: ClientProfile;
  onSelectInvoice: (item: ReviewItem) => void;
}

interface ParsedFilters {
  partyQuery?: string;
  monthQuery?: string;
  minPaise?: number;
  maxPaise?: number;
  amountLabel?: string;
}

export const InvoiceFinderModal: React.FC<InvoiceFinderModalProps> = ({
  isOpen,
  onClose,
  items,
  client,
  onSelectInvoice
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Natural query parser for financial search
  const parseQuery = (raw: string): { parsed: ParsedFilters; cleanQuery: string } => {
    const text = raw.trim().toLowerCase();
    const parsed: ParsedFilters = {};
    let clean = text;

    // 1. Amount range parser: e.g. "about 40k", "approx 50000", "40k", "53k"
    const amountMatch = text.match(/(?:about|approx|around|~)?\s*(\d+(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)?/i);
    if (amountMatch && amountMatch[1]) {
      const baseNum = parseFloat(amountMatch[1]);
      const unit = (amountMatch[2] || '').toLowerCase();
      let rupeeValue = baseNum;
      if (unit === 'k') rupeeValue = baseNum * 1000;
      else if (unit === 'lakh' || unit === 'lac') rupeeValue = baseNum * 100000;
      else if (unit === 'crore' || unit === 'cr') rupeeValue = baseNum * 10000000;

      // Range ±25%
      parsed.minPaise = Math.round(rupeeValue * 0.75 * 100);
      parsed.maxPaise = Math.round(rupeeValue * 1.25 * 100);
      parsed.amountLabel = `~₹${rupeeValue.toLocaleString('en-IN')}`;
    }

    // 2. Month parser
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug'];
    for (const m of months) {
      if (text.includes(m)) {
        parsed.monthQuery = m;
        break;
      }
    }

    // 3. Party words
    const stopWords = ['about', 'approx', 'around', 'bill', 'invoice', 'voucher', 'k', 'for', 'in', 'of'];
    const terms = text.split(/\s+/).filter(w => !stopWords.includes(w) && !months.includes(w) && !/^\d+$/.test(w));
    if (terms.length > 0) {
      parsed.partyQuery = terms.join(' ');
    }

    return { parsed, cleanQuery: text };
  };

  const { parsed } = parseQuery(query);

  // Score and rank candidates
  const scoredItems = items.map((item) => {
    let score = 0;
    const lowerTitle = item.title.toLowerCase();
    const lowerInvoice = (item.booksInvoice + ' ' + item.gstrInvoice).toLowerCase();
    const lowerWhy = item.why.toLowerCase();
    const lowerId = item.identifier.toLowerCase();

    if (!query.trim()) {
      return { item, score: 0.5, confidence: 0.85, snippet: `Recorded: ${item.booksDate || 'Sep 2024'} · Total: ${item.amount}` };
    }

    // Party matching
    if (parsed.partyQuery) {
      const queryWords = parsed.partyQuery.split(/\s+/);
      for (const w of queryWords) {
        if (lowerTitle.includes(w)) score += 0.45;
        if (lowerInvoice.includes(w)) score += 0.35;
        if (lowerWhy.includes(w)) score += 0.25;
        if (lowerId.includes(w)) score += 0.25;
      }
    }

    // Amount range matching
    if (parsed.minPaise !== undefined && parsed.maxPaise !== undefined) {
      if (item.rawAmountPaise >= parsed.minPaise && item.rawAmountPaise <= parsed.maxPaise) {
        score += 0.4;
      }
    }

    // Date/Month matching
    if (parsed.monthQuery) {
      if ((item.booksDate || '').toLowerCase().includes(parsed.monthQuery) || item.why.toLowerCase().includes(parsed.monthQuery)) {
        score += 0.2;
      }
    }

    const confidence = Math.min(0.99, Math.max(0.35, score));
    let snippet = `Matched in Books: ${item.booksInvoice} · ${item.title} (${item.amount})`;
    if (item.sourceSnippet) {
      snippet = `Matched in ${item.sourceSnippet.label}: "${item.sourceSnippet.ocrValue}" (${item.why.slice(0, 75)}…)`;
    }

    return { item, score, confidence, snippet };
  });

  const rankedCandidates = query.trim()
    ? scoredItems.sort((a, b) => b.score - a.score)
    : scoredItems;

  const topMatchStrong = rankedCandidates[0] && rankedCandidates[0].score >= 0.4;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, rankedCandidates.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rankedCandidates[selectedIndex]) {
        onSelectInvoice(rankedCandidates[selectedIndex].item);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="cockpit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Find invoice"
    >
      <div
        className="w-full max-w-2xl bg-[#171a21] border border-[#262a33] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#262a33] flex items-center gap-3 bg-[#0f1115]">
          <Search className="w-5 h-5 text-[#8a909c] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to find: e.g. 'transport bill September about 40k' or invoice #"
            className="flex-1 bg-transparent border-0 outline-none text-[#e8eaf0] placeholder-[#8a909c] text-sm font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#8a909c] hover:text-[#e8eaf0] text-xs"
            >
              Clear
            </button>
          )}
          <kbd className="px-2 py-1 rounded bg-[#171a21] border border-[#262a33] text-[11px] text-[#8a909c]">
            Esc
          </kbd>
        </div>

        {/* Structured Filter Pills: Clean, neutral border cards, no pill bubbles */}
        <div className="px-4 py-2 border-b border-[#262a33] bg-[#171a21] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8a909c]">Scope:</span>
          <span className="px-2 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#e8eaf0]">
            Client: {client.name.split(' ')[0]}
          </span>
          {parsed.partyQuery && (
            <span className="px-2 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#e8eaf0]">
              Party: "{parsed.partyQuery}"
            </span>
          )}
          {parsed.amountLabel && (
            <span className="px-2 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#e8eaf0]">
              Amount: {parsed.amountLabel}
            </span>
          )}
          {parsed.monthQuery && (
            <span className="px-2 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#e8eaf0]">
              Month: {parsed.monthQuery}
            </span>
          )}
        </div>

        {/* Weak match banner if no strong candidate */}
        {query.trim() && !topMatchStrong && (
          <div className="px-4 py-2 bg-[#0f1115] border-b border-[#262a33] text-xs text-[#f5b754]">
            No strong match — showing closest candidates based on partial party and token overlap.
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rankedCandidates.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#8a909c]">
              No documents matched this query. Try adjusting amount or vendor name.
            </div>
          ) : (
            rankedCandidates.map(({ item, confidence, snippet }, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectInvoice(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#1e222b] border-[#3ddc97]'
                      : 'bg-[#0f1115] border-[#262a33] hover:border-[#3a404c]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#e8eaf0] truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-[#8a909c]">
                        • {item.booksInvoice}
                      </span>
                    </div>
                    <p className="text-xs text-[#8a909c] mt-1 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                    <div className="mt-2 text-[11px] text-[#8a909c] flex items-center gap-3">
                      <span>Date: {item.booksDate || 'Sep 2024'}</span>
                      <span>•</span>
                      <span className="tabular-nums">
                        Confidence: {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums">
                      {item.amount}
                    </div>
                    {isSelected && (
                      <div className="text-[11px] text-[#3ddc97] mt-2 flex items-center gap-1 justify-end">
                        <span>Open (Enter)</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-3 border-t border-[#262a33] bg-[#0f1115] flex items-center justify-between text-xs text-[#8a909c]">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>Enter to inspect</span>
            <span>•</span>
            <span>Esc to close</span>
          </div>
          <div>
            Air-gapped on-device SQLite index
          </div>
        </div>
      </div>
    </div>
  );
};
