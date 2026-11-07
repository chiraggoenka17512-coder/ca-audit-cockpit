import React from 'react';
import { ReviewItem } from '../data/reviewItems';
import { CheckCircle2 } from 'lucide-react';

interface ReviewListProps {
  items: ReviewItem[];
  focusedIndex: number;
  activeItemId?: string;
  onOpenDetail: (item: ReviewItem) => void;
  onResetItems?: () => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  items,
  focusedIndex,
  activeItemId,
  onOpenDetail,
  onResetItems
}) => {
  if (items.length === 0) {
    return (
      <div className="cockpit-wrap text-center py-20">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#3ddc97]/10 border border-[#3ddc97]/30 flex items-center justify-center text-[#3ddc97]">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#e8eaf0] mb-2">All items reviewed!</h2>
        <p className="text-sm text-[#8a909c] max-w-md mx-auto mb-6">
          Every exception in this period has been approved or reconciled. The ledger is 100% clean and ready for Tally export.
        </p>
        {onResetItems && (
          <button
            onClick={onResetItems}
            className="cockpit-btn"
          >
            Reset sample review queue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="cockpit-wrap">
      <h1 className="cockpit-h1">What needs your review?</h1>
      <p className="cockpit-sub">
        {items.length} items to check. 92% of invoices already match automatically.
      </p>

      <div className="cockpit-list" role="list" aria-label="Items to review">
        {items.map((item, index) => {
          const isFocused = index === focusedIndex;
          const isSelected = activeItemId === item.id;
          return (
            <div
              key={item.id}
              role="listitem"
              tabIndex={0}
              onClick={() => onOpenDetail(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenDetail(item);
              }}
              className={`cockpit-row cursor-pointer transition ${
                isSelected 
                  ? 'bg-[#171a21] border-l-2 border-[#3ddc97]' 
                  : isFocused 
                    ? 'focused' 
                    : ''
              }`}
            >
              <div>
                <div className="cockpit-row-title">{item.title}</div>
                <div className="cockpit-row-meta">{item.meta}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="cockpit-row-amount">{item.amount}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(item);
                  }}
                  className={`cockpit-btn ${isSelected ? 'primary' : ''}`}
                >
                  {isSelected ? 'Inspecting' : 'Review'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
