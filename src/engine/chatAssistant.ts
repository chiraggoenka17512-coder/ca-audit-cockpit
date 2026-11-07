import { ReviewItem } from '../data/reviewItems';

export interface AssistantAnswer {
  headline: string;
  explanation: string;
  statutoryRule?: string;
  matchedItemId?: string;
  matchedItem?: ReviewItem;
  suggestedAction?: 'OPEN_REVIEW' | 'APPROVE' | 'VIEW_DEADLINES' | 'VIEW_RECON';
}

export function answerReconQuery(query: string, items: ReviewItem[]): AssistantAnswer | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Blue Dart
  if (q.includes('blue dart') || q.includes('891') || q.includes('timing')) {
    const item = items.find(i => i.title.toLowerCase().includes('blue dart'));
    return {
      headline: "Blue Dart Express Limited — 5-Day Timing Difference",
      explanation: "Invoice INV/2024/891 is dated 12 Sep in your books and 17 Sep in GSTR-2B. Both records agree on ₹53,100 total amount. Because the supplier uploaded within the allowed 30-day filing window, this invoice is 100% eligible for Input Tax Credit under Section 16(2)(aa).",
      statutoryRule: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 2. Reliance / RCM
  if (q.includes('reliance') || q.includes('882') || q.includes('rcm') || q.includes('reverse charge')) {
    const item = items.find(i => i.title.toLowerCase().includes('reliance'));
    return {
      headline: "Reliance Transport Bill #882 — Reverse Charge (RCM) Pending",
      explanation: "Invoice BILL/882 for ₹24,500 is flagged because reverse charge applies under Section 9(3). The transporter has not submitted the non-availment of ITC declaration. Confirm GTA declaration before payment.",
      statutoryRule: "Section 9(3) CGST Act (GTA RCM Notifications 13/2017 & 05/2022)",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 3. Bharat Logistics / Tax rate mismatch
  if (q.includes('bharat') || q.includes('tax rate') || q.includes('rate mismatch') || q.includes('18%') || q.includes('12%')) {
    const item = items.find(i => i.title.toLowerCase().includes('bharat'));
    return {
      headline: "Bharat Logistics Corp — Tax Rate Mismatch",
      explanation: "Your books show 18% GST (Total ₹8,900; Tax ₹1,357), while the vendor filed at 12% GST (Total ₹8,426; Tax ₹902). Check the physical invoice copy to verify if the transport was composite supply or freight before approving ITC.",
      statutoryRule: "Section 16(2)(c) CGST Act & Notification 11/2017-CT(R)",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 4. Legal fee / 194J / TDS / 15H
  if (q.includes('194j') || q.includes('legal fee') || q.includes('15h') || q.includes('tds')) {
    const item = items.find(i => i.title.toLowerCase().includes('194j') || i.title.toLowerCase().includes('legal'));
    return {
      headline: "Legal Fee TDS Deduction (194J) — Form 15H Verification",
      explanation: "Payment of ₹12,000 to advocate/consultant is flagged for TDS. The vendor submitted Form 15H seeking nil TDS deduction under Section 197A. Confirm the PAN validity and declaration upload on TRACES before clearing the voucher.",
      statutoryRule: "Section 194J & Section 197A of Income Tax Act, 1961",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 5. Unfiled invoices / Missing in 2B
  if (q.includes('unfiled') || q.includes('missing') || q.includes('portal') || q.includes('rajasthan')) {
    const item = items.find(i => i.title.toLowerCase().includes('rajasthan') || i.category === 'MISSING_2B');
    return {
      headline: "Unfiled Invoices & ITC at Risk",
      explanation: "Rajasthan Heavy Haulage Logistics (₹1,79,200) was recorded in your books on 22 Sep, but has NOT been uploaded by the vendor to GSTR-2B. Under Section 16(2)(aa), ITC of ₹19,200 cannot be claimed until the vendor files GSTR-1.",
      statutoryRule: "Section 16(2)(aa) CGST Act & CBIC Circular 170/02/2022-GST",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 6. Tata Tele
  if (q.includes('tata') || q.includes('typo') || q.includes('00482')) {
    const item = items.find(i => i.title.toLowerCase().includes('tata'));
    return {
      headline: "Tata Tele Business Services — Invoice Separator Typo",
      explanation: "Invoice number differs only by delimiter: your books have 'TI/24-25/00482' and GSTR-2B has 'TI-24-25-00482' (Levenshtein distance 2). Amount is exactly ₹99,120 and dates match. Safe to approve typo match.",
      statutoryRule: "Deterministic String Normalization Rule 4",
      matchedItemId: item?.id,
      matchedItem: item,
      suggestedAction: item ? 'OPEN_REVIEW' : undefined
    };
  }

  // 7. Deadlines
  if (q.includes('deadline') || q.includes('due date') || q.includes('calendar') || q.includes('when')) {
    return {
      headline: "Upcoming Statutory Deadlines (Oct - Nov 2024)",
      explanation: "Key upcoming compliance dates: 07 Nov (TDS deposit for Oct under 194C/J), 11 Nov (GSTR-1 Outward Supplies), 20 Nov (GSTR-3B Monthly Return & ITC Reconciliation).",
      statutoryRule: "Rule 61(5) CGST Rules & Sec 200(1) Income Tax Act",
      suggestedAction: 'VIEW_DEADLINES'
    };
  }

  // 8. Auto-match / Reconciliation
  if (q.includes('auto') || q.includes('recon') || q.includes('match') || q.includes('92%') || q.includes('tally')) {
    return {
      headline: "Deterministic Reconciliation Status",
      explanation: "482 invoices (92% of client register) matched automatically with 100% mathematical certainty under the ±₹1.00 rounding tolerance. Ready for 1-click Tally XML export.",
      statutoryRule: "Rule 36(4) Matching Algorithm & Integer Paise Precision",
      suggestedAction: 'VIEW_RECON'
    };
  }

  // 9. Generic search fallback across all items
  const matchingItem = items.find(it => 
    it.title.toLowerCase().includes(q) ||
    it.identifier.toLowerCase().includes(q) ||
    it.booksInvoice.toLowerCase().includes(q) ||
    it.meta.toLowerCase().includes(q) ||
    it.amount.includes(q)
  );

  if (matchingItem) {
    return {
      headline: `${matchingItem.title} (${matchingItem.amount})`,
      explanation: `${matchingItem.meta}. ${matchingItem.why}`,
      statutoryRule: "Client Register vs GSTR-2B Record",
      matchedItemId: matchingItem.id,
      matchedItem: matchingItem,
      suggestedAction: 'OPEN_REVIEW'
    };
  }

  // Default helpful message
  return {
    headline: `Search for "${query}"`,
    explanation: `No exact flagged exception matched "${query}". You can ask about: "Why is Blue Dart flagged?", "Show unfiled invoices this month", "Reliance", "tax rate mismatch", or "deadlines".`,
    statutoryRule: "ReconOS Local Intelligence"
  };
}
