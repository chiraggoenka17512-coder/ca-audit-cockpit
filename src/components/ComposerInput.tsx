import React, { useState, useRef } from 'react';
import { ReviewItem } from '../data/reviewItems';
import { answerReconQuery, AssistantAnswer } from '../engine/chatAssistant';
import { X } from 'lucide-react';

interface ComposerInputProps {
  items: ReviewItem[];
  onOpenDetail: (item: ReviewItem) => void;
  onApproveItem: (item: ReviewItem) => void;
  onNavigateToView: (view: 'reconciliation' | 'deadlines') => void;
}

export const ComposerInput: React.FC<ComposerInputProps> = ({
  items,
  onOpenDetail,
  onApproveItem,
  onNavigateToView
}) => {
  const [query, setQuery] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<AssistantAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setActiveAnswer(null);
      return;
    }
    const answer = answerReconQuery(text, items);
    setActiveAnswer(answer);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setActiveAnswer(null);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const handleActionClick = () => {
    if (!activeAnswer) return;

    if (activeAnswer.suggestedAction === 'OPEN_REVIEW' && activeAnswer.matchedItem) {
      onOpenDetail(activeAnswer.matchedItem);
      setActiveAnswer(null);
    } else if (activeAnswer.suggestedAction === 'APPROVE' && activeAnswer.matchedItem) {
      onApproveItem(activeAnswer.matchedItem);
      setActiveAnswer(null);
    } else if (activeAnswer.suggestedAction === 'VIEW_DEADLINES') {
      onNavigateToView('deadlines');
      setActiveAnswer(null);
    } else if (activeAnswer.suggestedAction === 'VIEW_RECON') {
      onNavigateToView('reconciliation');
      setActiveAnswer(null);
    }
  };

  return (
    <div className="cockpit-composer">
      {/* Answer box: Clean, flat, no magical sparkles icon or shadow soup */}
      {activeAnswer && (
        <div className="max-w-[680px] mx-auto mb-3 p-4 rounded-lg bg-[#171a21] border border-[#262a33]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-medium text-sm text-[#e8eaf0]">{activeAnswer.headline}</h3>
            <button
              type="button"
              onClick={() => setActiveAnswer(null)}
              className="text-[#8a909c] hover:text-[#e8eaf0] p-1 text-xs"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#8a909c] leading-relaxed mb-3">
            {activeAnswer.explanation}
          </p>

          <div className="flex items-center justify-between text-xs pt-1">
            {activeAnswer.statutoryRule ? (
              <span className="text-xs text-[#8a909c]">
                {activeAnswer.statutoryRule}
              </span>
            ) : <span />}

            {activeAnswer.suggestedAction && (
              <button
                type="button"
                onClick={handleActionClick}
                className="cockpit-btn primary text-xs py-1.5 px-3"
              >
                {activeAnswer.suggestedAction === 'OPEN_REVIEW' && 'Review item'}
                {activeAnswer.suggestedAction === 'APPROVE' && 'Approve match'}
                {activeAnswer.suggestedAction === 'VIEW_DEADLINES' && 'View deadlines'}
                {activeAnswer.suggestedAction === 'VIEW_RECON' && 'View reconciliation'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Composer Input Box */}
      <div className="cockpit-composer-box">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about an invoice, vendor, or deadline…"
          aria-label="Chat query input"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveAnswer(null);
            }}
            className="text-[#8a909c] hover:text-[#e8eaf0] text-xs px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="cockpit-hint">
        <div>
          Try:{' '}
          <button
            type="button"
            onClick={() => handleSearch('Show unfiled invoices this month')}
            className="underline hover:text-[#e8eaf0] transition"
          >
            "Show unfiled invoices this month"
          </button>
          {' or '}
          <button
            type="button"
            onClick={() => handleSearch('Why is Blue Dart flagged?')}
            className="underline hover:text-[#e8eaf0] transition"
          >
            "Why is Blue Dart flagged?"
          </button>
        </div>
        <span className="text-xs text-[#8a909c]">
          ReconOS Assistant
        </span>
      </div>
    </div>
  );
};
