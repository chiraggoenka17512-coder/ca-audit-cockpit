import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ReviewItem } from '../data/reviewItems';
import { ClientProfile } from '../data/clientDatabases';
import { Search, X, CornerDownLeft, AlertCircle } from 'lucide-react';

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
  monthNumber?: string;
  minPaise?: number;
  maxPaise?: number;
  amountLabel?: string;
  invoiceQuery?: string;
}

type AmountFilterTier = 'all' | 'under25k' | '25k-100k' | 'over100k';

export const InvoiceFinderModal: React.FC<InvoiceFinderModalProps> = ({
  isOpen,
  onClose,
  items,
  client,
  onSelectInvoice
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);
  const [activeAmountTier, setActiveAmountTier] = useState<AmountFilterTier>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveMonthFilter(null);
      setActiveAmountTier('all');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Natural query parser for financial search
  const parseNaturalQuery = (raw: string): { parsed: ParsedFilters; cleanTerms: string[] } => {
    const text = raw.trim().toLowerCase();
    const parsed: ParsedFilters = {};

    if (!text) return { parsed, cleanTerms: [] };

    let workingText = text;

    // 1. Month parser (full names and abbreviations)
    const monthMap: Record<string, { num: string; name: string }> = {
      january: { num: '01', name: 'January' },
      jan: { num: '01', name: 'January' },
      february: { num: '02', name: 'February' },
      feb: { num: '02', name: 'February' },
      march: { num: '03', name: 'March' },
      mar: { num: '03', name: 'March' },
      april: { num: '04', name: 'April' },
      apr: { num: '04', name: 'April' },
      may: { num: '05', name: 'May' },
      june: { num: '06', name: 'June' },
      jun: { num: '06', name: 'June' },
      july: { num: '07', name: 'July' },
      jul: { num: '07', name: 'July' },
      august: { num: '08', name: 'August' },
      aug: { num: '08', name: 'August' },
      september: { num: '09', name: 'September' },
      sept: { num: '09', name: 'September' },
      sep: { num: '09', name: 'September' },
      october: { num: '10', name: 'October' },
      oct: { num: '10', name: 'October' },
      november: { num: '11', name: 'November' },
      nov: { num: '11', name: 'November' },
      december: { num: '12', name: 'December' },
      dec: { num: '12', name: 'December' }
    };

    for (const [key, meta] of Object.entries(monthMap)) {
      const monthRegex = new RegExp(`\\b${key}\\b`, 'i');
      if (monthRegex.test(workingText)) {
        parsed.monthQuery = meta.name;
        parsed.monthNumber = meta.num;
        workingText = workingText.replace(monthRegex, ' ').trim();
        break;
      }
    }

    // 2. Amount range parser: e.g. "about 40k", "approx 50000", "~53k", "₹53,100", "40k", "1.79 lakh"
    // Case A: explicit range keyword (about/approx/around/roughly/~)
    const approxMatch = workingText.match(/(?:about|approx|around|roughly|~)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)?/i);
    // Case B: currency symbol or multiplier (₹40,000, 40k, 1.5 lakh)
    const currencyMatch = !approxMatch ? workingText.match(/(?:(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)?|(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac|crore|cr)\b)/i) : null;
    // Case C: formatted number with comma (e.g. 53,100 or 1,79,200)
    const formattedMatch = (!approxMatch && !currencyMatch) ? workingText.match(/\b(\d{1,3}(?:,\d{2,3})+)\b/) : null;

    const matchedAmount = approxMatch || currencyMatch || formattedMatch;

    if (matchedAmount) {
      const rawNumStr = (matchedAmount[1] || matchedAmount[3] || '').replace(/,/g, '');
      const unit = (matchedAmount[2] || matchedAmount[4] || '').toLowerCase();
      const baseNum = parseFloat(rawNumStr);

      if (!isNaN(baseNum) && baseNum > 0) {
        let rupeeValue = baseNum;
        if (unit === 'k') rupeeValue = baseNum * 1000;
        else if (unit === 'lakh' || unit === 'lac') rupeeValue = baseNum * 100000;
        else if (unit === 'crore' || unit === 'cr') rupeeValue = baseNum * 10000000;

        // ±25% for approximate searches, ±10% for specific numbers
        const tolerance = (approxMatch || unit === 'k' || unit === 'lakh' || unit === 'crore') ? 0.25 : 0.10;
        parsed.minPaise = Math.round(rupeeValue * (1 - tolerance) * 100);
        parsed.maxPaise = Math.round(rupeeValue * (1 + tolerance) * 100);
        parsed.amountLabel = approxMatch
          ? `~₹${rupeeValue.toLocaleString('en-IN')}`
          : `₹${rupeeValue.toLocaleString('en-IN')}`;

        workingText = workingText.replace(matchedAmount[0], ' ').trim();
      }
    } else {
      // Standalone integer (e.g. "50000" or "24500") if >= 3000 and not a year
      const bareNumMatch = workingText.match(/\b(\d{4,7})\b/);
      if (bareNumMatch) {
        const val = parseInt(bareNumMatch[1], 10);
        // Exclude 2020-2030 which are calendar years
        if (val < 2020 || val > 2030) {
          parsed.minPaise = Math.round(val * 0.85 * 100);
          parsed.maxPaise = Math.round(val * 1.15 * 100);
          parsed.amountLabel = `~₹${val.toLocaleString('en-IN')}`;
          workingText = workingText.replace(bareNumMatch[0], ' ').trim();
        }
      }
    }

    // 3. Invoice number pattern
    const invoiceMatch = workingText.match(/(?:inv|bill|#|\/)?\s*([a-z0-9\/-]*(?:\d{3,})[a-z0-9\/-]*)/i);
    if (invoiceMatch && invoiceMatch[1] && invoiceMatch[1].length >= 3) {
      parsed.invoiceQuery = invoiceMatch[1].toLowerCase();
    }

    // 4. Remaining party words
    const stopWords = new Set([
      'about', 'approx', 'around', 'roughly', 'near', 'in', 'for', 'of', 'to', 'at',
      'and', 'the', 'a', 'an', 'bill', 'invoice', 'voucher', 'k', 'rs', 'inr', 'show',
      'find', 'search', 'check', 'with', 'from', 'all', 'open'
    ]);

    const terms = workingText
      .split(/[\s,]+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !stopWords.has(w));

    if (terms.length > 0) {
      parsed.partyQuery = terms.join(' ');
    }

    return { parsed, cleanTerms: terms };
  };

  const { parsed } = useMemo(() => parseNaturalQuery(query), [query]);

  // Candidate scoring and ranking
  const rankedCandidates = useMemo(() => {
    return items.map((item) => {
      let score = 0;
      let matchedReason = '';
      const lowerTitle = item.title.toLowerCase();
      const lowerInvoice = `${item.booksInvoice} ${item.gstrInvoice}`.toLowerCase();
      const lowerWhy = item.why.toLowerCase();
      const lowerId = item.identifier.toLowerCase();
      const lowerLedger = (item.assignedLedger || '').toLowerCase();
      const lowerOcr = (item.sourceSnippet?.ocrValue || '').toLowerCase();

      // If no query and no manual filters, return default list sorted by priority
      if (!query.trim() && !activeMonthFilter && activeAmountTier === 'all') {
        return {
          item,
          score: 1.0,
          confidence: item.confidenceScore,
          snippet: item.sourceSnippet
            ? `${item.sourceSnippet.label}: "${item.sourceSnippet.ocrValue}" · ${item.assignedLedger || 'General'}`
            : `Recorded: ${item.booksDate || 'Sep 2024'} · ${item.why.slice(0, 95)}`,
          isWeakMatch: false
        };
      }

      // Party query matching
      if (parsed.partyQuery) {
        const queryWords = parsed.partyQuery.split(/\s+/);
        let partyHits = 0;
        for (const w of queryWords) {
          if (lowerTitle.includes(w)) {
            score += 0.45;
            partyHits++;
          }
          if (lowerInvoice.includes(w)) {
            score += 0.35;
            partyHits++;
          }
          if (lowerOcr.includes(w)) {
            score += 0.30;
            partyHits++;
          }
          if (lowerLedger.includes(w)) {
            score += 0.25;
            partyHits++;
          }
          if (lowerWhy.includes(w)) {
            score += 0.20;
            partyHits++;
          }
          if (lowerId.includes(w)) {
            score += 0.30;
            partyHits++;
          }
        }
        if (partyHits > 0) {
          matchedReason = `Party matches "${parsed.partyQuery}"`;
        }
      }

      // Invoice number query
      if (parsed.invoiceQuery) {
        if (lowerInvoice.includes(parsed.invoiceQuery)) {
          score += 0.55;
          matchedReason = `Invoice #${parsed.invoiceQuery}`;
        }
      }

      // Amount filter matching (from parsed query or manual tier)
      let amountMatched = false;
      if (parsed.minPaise !== undefined && parsed.maxPaise !== undefined) {
        if (item.rawAmountPaise >= parsed.minPaise && item.rawAmountPaise <= parsed.maxPaise) {
          score += 0.45;
          amountMatched = true;
        } else {
          // Distance penalty
          const mid = (parsed.minPaise + parsed.maxPaise) / 2;
          const diffRatio = Math.abs(item.rawAmountPaise - mid) / mid;
          if (diffRatio < 0.5) {
            score += 0.20;
          }
        }
      }

      // Manual amount tier filter
      if (activeAmountTier === 'under25k') {
        if (item.rawAmountPaise < 2500000) score += 0.4;
        else score -= 0.5;
      } else if (activeAmountTier === '25k-100k') {
        if (item.rawAmountPaise >= 2500000 && item.rawAmountPaise <= 10000000) score += 0.4;
        else score -= 0.5;
      } else if (activeAmountTier === 'over100k') {
        if (item.rawAmountPaise > 10000000) score += 0.4;
        else score -= 0.5;
      }

      // Month matching (from parsed query or manual filter)
      const targetMonthNum = parsed.monthNumber || (activeMonthFilter ? '09' : undefined);
      const targetMonthName = parsed.monthQuery || activeMonthFilter;

      if (targetMonthNum || targetMonthName) {
        const dateStr = (item.booksDate || item.filingDate || '').toLowerCase();
        let monthHit = false;

        if (targetMonthNum && dateStr.includes(`/${targetMonthNum}/`)) {
          score += 0.35;
          monthHit = true;
        } else if (targetMonthName && (lowerWhy.includes(targetMonthName.toLowerCase()) || dateStr.includes(targetMonthName.toLowerCase()))) {
          score += 0.30;
          monthHit = true;
        }

        if (monthHit && !matchedReason) {
          matchedReason = `Month: ${targetMonthName || 'Sep 2024'}`;
        }
      }

      // Fallback matching on generic query string if nothing structured hit
      if (score === 0 && query.trim()) {
        const q = query.trim().toLowerCase();
        if (lowerTitle.includes(q) || lowerInvoice.includes(q) || lowerWhy.includes(q)) {
          score += 0.35;
        }
      }

      const isWeakMatch = score > 0 && score < 0.45;
      const confidence = Math.min(0.99, Math.max(0.35, item.confidenceScore * (score >= 0.45 ? 1 : 0.8)));

      let snippet = `Matched in Books: ${item.booksInvoice} · ${item.title} (${item.amount})`;
      if (item.sourceSnippet) {
        snippet = `Matched in ${item.sourceSnippet.label}: "${item.sourceSnippet.ocrValue}" (${item.why.slice(0, 85)}…)`;
      } else if (matchedReason) {
        snippet = `${matchedReason} · Recorded: ${item.booksDate || 'Sep 2024'} (${item.why.slice(0, 80)}…)`;
      }

      return {
        item,
        score,
        confidence,
        snippet,
        isWeakMatch
      };
    })
    .filter(candidate => {
      // If query or manual filter is applied, only show candidates with score > 0
      if (query.trim() || activeMonthFilter || activeAmountTier !== 'all') {
        return candidate.score > 0;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);
  }, [items, query, parsed, activeMonthFilter, activeAmountTier]);

  const hasStrongMatch = rankedCandidates.length > 0 && rankedCandidates[0].score >= 0.45;
  const showNoStrongMatchBanner = query.trim().length > 0 && rankedCandidates.length > 0 && !hasStrongMatch;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, rankedCandidates.length - 1)));
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

  if (!isOpen) return null;

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
        className="w-full max-w-2xl bg-[#171a21] border border-[#262a33] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
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
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
              }}
              className="text-[#8a909c] hover:text-[#e8eaf0] text-xs px-2 py-1 rounded hover:bg-[#1e222b] transition"
            >
              Clear
            </button>
          )}
          <kbd className="px-2 py-1 rounded bg-[#171a21] border border-[#262a33] text-[11px] text-[#8a909c]">
            Esc
          </kbd>
        </div>

        {/* Structured Filter Pills: Clean, neutral border cards conforming to Zero AI Design Slop */}
        <div className="px-4 py-2.5 border-b border-[#262a33] bg-[#171a21] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8a909c]">Scope:</span>

          {/* Client Scope Pill */}
          <span 
            className="px-2.5 py-1 rounded-md bg-[#0f1115] border border-[#262a33] text-[#e8eaf0] font-medium"
            title="Air-gapped client workspace boundary"
          >
            Client: {client.name.split(' ')[0]}
          </span>

          {/* Party Filter Pill */}
          {parsed.partyQuery ? (
            <span className="px-2.5 py-1 rounded-md bg-[#0f1115] border border-[#3ddc97]/50 text-[#e8eaf0] flex items-center gap-1.5">
              <span>Party: "{parsed.partyQuery}"</span>
              <button
                type="button"
                onClick={() => setQuery(prev => prev.replace(parsed.partyQuery || '', '').trim())}
                className="text-[#8a909c] hover:text-[#e8eaf0]"
                title="Remove party filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md bg-[#0f1115] border border-[#262a33] text-[#8a909c]">
              Party: All
            </span>
          )}

          {/* Month Filter Pill */}
          {parsed.monthQuery || activeMonthFilter ? (
            <span className="px-2.5 py-1 rounded-md bg-[#0f1115] border border-[#3ddc97]/50 text-[#e8eaf0] flex items-center gap-1.5">
              <span>Month: {parsed.monthQuery || activeMonthFilter}</span>
              <button
                type="button"
                onClick={() => {
                  if (activeMonthFilter) setActiveMonthFilter(null);
                  if (parsed.monthQuery) {
                    setQuery(prev => prev.replace(new RegExp(parsed.monthQuery || '', 'i'), '').trim());
                  }
                }}
                className="text-[#8a909c] hover:text-[#e8eaf0]"
                title="Remove month filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setActiveMonthFilter('September')}
              className="px-2 py-1 rounded-md bg-[#0f1115] border border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0] hover:border-[#3a404c] transition"
              title="Click to filter by September"
            >
              Month: All
            </button>
          )}

          {/* Amount Range Filter Pill */}
          {parsed.amountLabel ? (
            <span className="px-2.5 py-1 rounded-md bg-[#0f1115] border border-[#3ddc97]/50 text-[#e8eaf0] flex items-center gap-1.5">
              <span>Amount: {parsed.amountLabel}</span>
              <button
                type="button"
                onClick={() => setQuery(prev => prev.replace(/(?:about|approx|around|~)?\s*(?:rs\.?|inr|₹)?\s*\d+[k\d,]*/i, '').trim())}
                className="text-[#8a909c] hover:text-[#e8eaf0]"
                title="Remove amount filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : activeAmountTier !== 'all' ? (
            <span className="px-2.5 py-1 rounded-md bg-[#0f1115] border border-[#3ddc97]/50 text-[#e8eaf0] flex items-center gap-1.5">
              <span>Amount: {activeAmountTier === 'under25k' ? '< ₹25k' : activeAmountTier === '25k-100k' ? '₹25k - ₹1L' : '> ₹1L'}</span>
              <button
                type="button"
                onClick={() => setActiveAmountTier('all')}
                className="text-[#8a909c] hover:text-[#e8eaf0]"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveAmountTier('under25k')}
                className="px-1.5 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0] text-[11px]"
              >
                &lt; ₹25k
              </button>
              <button
                type="button"
                onClick={() => setActiveAmountTier('25k-100k')}
                className="px-1.5 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0] text-[11px]"
              >
                ₹25k-1L
              </button>
              <button
                type="button"
                onClick={() => setActiveAmountTier('over100k')}
                className="px-1.5 py-0.5 rounded bg-[#0f1115] border border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0] text-[11px]"
              >
                &gt; ₹1L
              </button>
            </div>
          )}
        </div>

        {/* Fallback Banner for No Strong Match */}
        {showNoStrongMatchBanner && (
          <div className="px-4 py-2.5 bg-[#0f1115] border-b border-[#262a33] flex items-center gap-2 text-xs text-[#f5b754]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No strong match — showing closest candidates based on partial token and amount overlap.</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rankedCandidates.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#8a909c]">
              No documents matched this query. Try adjusting amount or vendor name.
            </div>
          ) : (
            rankedCandidates.map(({ item, confidence, snippet, isWeakMatch }, idx) => {
              const isSelected = idx === selectedIndex;
              const isLowConfidence = confidence < 0.85;

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
                      {isWeakMatch && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#171a21] border border-[#f5b754]/40 text-[#f5b754]">
                          Closest candidate
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8a909c] mt-1 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                    <div className="mt-2 text-[11px] text-[#8a909c] flex items-center gap-3">
                      <span>Date: {item.booksDate || 'Sep 2024'}</span>
                      <span>•</span>
                      <span className={`tabular-nums ${isLowConfidence ? 'text-[#f5b754]' : 'text-[#8a909c]'}`}>
                        Confidence: {Math.round(confidence * 100)}%
                        {isLowConfidence && ' (Requires check)'}
                      </span>
                      {item.assignedLedger && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">{item.assignedLedger}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums">
                      {item.amount}
                    </div>
                    {isSelected ? (
                      <div className="text-[11px] text-[#3ddc97] mt-2 flex items-center gap-1 justify-end font-medium">
                        <span>Open (Enter)</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8a909c] mt-2">
                        {item.category}
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
