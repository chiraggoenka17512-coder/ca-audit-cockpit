import React, { useState, useMemo } from 'react';
import { ClientProfile } from '../../data/clientDatabases';
import { BookInvoice, GSTR2BRecord, ReconciledItem } from '../../types';
import { SEEDED_BOOK_INVOICES, SEEDED_GSTR2B_RECORDS } from '../../data/mockDataset';
import { 
  reconcileDatasets, 
  computeReconciliationSummary, 
  formatPaiseToINR, 
  parseToPaise 
} from '../../engine/reconciliation';
import { 
  Check, 
  X, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  FileWarning, 
  Layers 
} from 'lucide-react';

interface ReconciliationViewProps {
  client: ClientProfile;
  onNavigateToExceptions?: () => void;
}

type MatchStatusFilter = 'all' | 'matched' | 'suggestions' | 'exceptions';

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ 
  client, 
  onNavigateToExceptions 
}) => {
  // Dual source selectors
  const [sourceA, setSourceA] = useState('Purchase Register (Books)');
  const [sourceB, setSourceB] = useState('GSTR-2B (GST Portal)');

  // Filter Bar state
  const [selectedPeriod, setSelectedPeriod] = useState('Sep 2024 (Q2 Filing)');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');

  // Expanded rows state for collapsed matched lines
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Local state for interactive suggestion approvals/rejections
  const [approvedSuggestionIds, setApprovedSuggestionIds] = useState<Set<string>>(new Set());
  const [rejectedSuggestionIds, setRejectedSuggestionIds] = useState<Set<string>>(new Set());

  // Base datasets: Seeded Indian Books & GSTR-2B records augmented with Stage 1, 2, 3 test cases
  const booksDataset: BookInvoice[] = useMemo(() => {
    return [
      ...SEEDED_BOOK_INVOICES,
      // Additional Stage 3 test case: Fuzzy Party Name (strict paise and GSTIN)
      {
        id: "book-bhel",
        invoiceNumber: "BHEL/BPL/5510",
        invoiceDate: "2024-09-20",
        vendorName: "Bharat Heavy Electricals Limited",
        vendorGSTIN: "23AAACB2233M1Z1",
        taxableValue: 207627.12,
        cgst: 18686.44,
        sgst: 18686.44,
        igst: 0.00,
        totalAmount: 245000.00,
        assignedLedger: "Plant & Machinery Spares",
        tdsSection: "194C",
        voucherType: "Purchase"
      },
      // Additional Stage 2 test case: 50 paise rounding delta
      {
        id: "book-godrej",
        invoiceNumber: "GB/24/9901",
        invoiceDate: "2024-09-14",
        vendorName: "Godrej & Boyce Mfg Co Ltd",
        vendorGSTIN: "27AABCG1122K1Z9",
        taxableValue: 108475.00,
        cgst: 9762.75,
        sgst: 9762.75,
        igst: 0.00,
        totalAmount: 128000.50,
        assignedLedger: "Office Equipment & Furniture",
        tdsSection: "None",
        voucherType: "Purchase"
      },
      // Additional Stage 4 test case: Extended timing drift suggestion (35 days delta)
      {
        id: "book-voltas",
        invoiceNumber: "VOLT/24/099",
        invoiceDate: "2024-09-05",
        vendorName: "Voltas Limited",
        vendorGSTIN: "27AAACV0123L1Z4",
        taxableValue: 100000.00,
        cgst: 9000.00,
        sgst: 9000.00,
        igst: 0.00,
        totalAmount: 118000.00,
        assignedLedger: "Air Conditioning Maintenance",
        tdsSection: "194C",
        voucherType: "Purchase"
      }
    ];
  }, []);

  const portalDataset: GSTR2BRecord[] = useMemo(() => {
    return [
      ...SEEDED_GSTR2B_RECORDS,
      // Matches book-bhel with slight vendor name string variance (similarity > 0.82)
      {
        id: "gstr-bhel",
        supplierGSTIN: "23AAACB2233M1Z1",
        supplierTradeName: "Bharat Heavy Electricals Ltd",
        invoiceNumber: "BHEL/BPL/5510",
        invoiceDate: "2024-09-20",
        invoiceValue: 245000.00,
        taxableValue: 207627.12,
        integratedTax: 0.00,
        centralTax: 18686.44,
        stateTax: 18686.44,
        filingDate: "2024-10-10",
        itcAvailable: "Y"
      },
      // Matches book-godrej with 50 paise rounding variance (128000.00 vs 128000.50)
      {
        id: "gstr-godrej",
        supplierGSTIN: "27AABCG1122K1Z9",
        supplierTradeName: "GODREJ & BOYCE MFG CO LTD",
        invoiceNumber: "GB/24/9901",
        invoiceDate: "2024-09-14",
        invoiceValue: 128000.00,
        taxableValue: 108474.58,
        integratedTax: 0.00,
        centralTax: 9762.71,
        stateTax: 9762.71,
        filingDate: "2024-10-10",
        itcAvailable: "Y"
      },
            // Matches book-voltas with 35 days timing difference (> 30d, <= 45d -> Suggestion)
      {
        id: "gstr-voltas",
        supplierGSTIN: "27AAACV0123L1Z4",
        supplierTradeName: "VOLTAS LIMITED",
        invoiceNumber: "VOLT/24/099",
        invoiceDate: "2024-08-01",
        invoiceValue: 118000.00,
        taxableValue: 100000.00,
        integratedTax: 0.00,
        centralTax: 9000.00,
        stateTax: 9000.00,
        filingDate: "2024-09-10",
        itcAvailable: "Y"
      },
      // Extra portal record missing in books (Unclaimed purchase)
      {
        id: "gstr-unclaimed-01",
        supplierGSTIN: "27AAACM1234P1Z8",
        supplierTradeName: "MAHINDRA LOGISTICS LIMITED",
        invoiceNumber: "MLL/W/9912",
        invoiceDate: "2024-09-25",
        invoiceValue: 64900.00,
        taxableValue: 55000.00,
        integratedTax: 0.00,
        centralTax: 4950.00,
        stateTax: 4950.00,
        filingDate: "2024-10-09",
        itcAvailable: "Y"
      }
    ];
  }, []);

  // Compute pure deterministic reconciliation
  const rawReconciliationResults = useMemo(() => {
    return reconcileDatasets(booksDataset, portalDataset);
  }, [booksDataset, portalDataset]);

  // Adjust results with user interactive approvals/rejections of suggestions
  const reconciliationResults = useMemo(() => {
    return rawReconciliationResults.map(item => {
      if (approvedSuggestionIds.has(item.id)) {
        return {
          ...item,
          isApproved: true,
          confidenceScore: 1.0,
          status: 'EXACT_MATCH' as const,
          matchRule: `${item.matchRule} (Manually Approved)`
        };
      }
      if (rejectedSuggestionIds.has(item.id)) {
        return {
          ...item,
          isApproved: false,
          confidenceScore: 0.0,
          status: 'RATE_MISMATCH' as const,
          matchRule: 'Match Suggestion Rejected'
        };
      }
      return item;
    });
  }, [rawReconciliationResults, approvedSuggestionIds, rejectedSuggestionIds]);

  // Batch summary metrics
  const summary = useMemo(() => {
    return computeReconciliationSummary(booksDataset, portalDataset, reconciliationResults);
  }, [booksDataset, portalDataset, reconciliationResults]);

  // Split results into categories
  const matchedPairs = useMemo(() => {
    return reconciliationResults.filter(r => 
      (r.status === 'EXACT_MATCH' || r.status === 'TIMING_DIFF' || r.status === 'RELAXED_MATCH' || r.status === 'FUZZY_PARTY') &&
      r.confidenceScore >= 0.85 &&
      r.bookRecord && r.portalRecord
    );
  }, [reconciliationResults]);

  const suggestions = useMemo(() => {
    return reconciliationResults.filter(r => 
      r.confidenceScore < 0.85 && 
      r.confidenceScore > 0 && 
      !r.isApproved && 
      r.bookRecord && 
      r.portalRecord
    );
  }, [reconciliationResults]);

  const unmatchedExceptions = useMemo(() => {
    return reconciliationResults.filter(r => 
      r.status === 'MISSING_IN_2B' || 
      r.status === 'RATE_MISMATCH' || 
      r.status === 'MISSING_IN_BOOKS'
    );
  }, [reconciliationResults]);

  // Group unmatched exceptions by root cause
  const exceptionsByCause = useMemo(() => {
    const missing2B = unmatchedExceptions.filter(e => e.status === 'MISSING_IN_2B');
    const rateMismatches = unmatchedExceptions.filter(e => e.status === 'RATE_MISMATCH');
    const missingBooks = unmatchedExceptions.filter(e => e.status === 'MISSING_IN_BOOKS');
    return { missing2B, rateMismatches, missingBooks };
  }, [unmatchedExceptions]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApproveSuggestion = (id: string) => {
    setApprovedSuggestionIds(prev => new Set(prev).add(id));
  };

  const handleRejectSuggestion = (id: string) => {
    setRejectedSuggestionIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="cockpit-wrap space-y-6">
      {/* Title Bar & Dual Source Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262a33]">
        <div>
          <h1 className="cockpit-h1">Reconciliation</h1>
          <p className="cockpit-sub mb-0">
            Side-by-side deterministic matching for {client.name}
          </p>
        </div>

        {/* Source Selectors */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={sourceA}
            onChange={(e) => setSourceA(e.target.value)}
            className="bg-[#171a21] border border-[#262a33] text-[#e8eaf0] rounded px-3 py-1.5 focus:outline-none"
          >
            <option value="Purchase Register (Books)">Purchase Register (Books)</option>
            <option value="General Ledger (Books)">General Ledger (Books)</option>
            <option value="Bank Receipts (Books)">Bank Receipts (Books)</option>
          </select>
          <span className="text-[#8a909c]">vs</span>
          <select
            value={sourceB}
            onChange={(e) => setSourceB(e.target.value)}
            className="bg-[#171a21] border border-[#262a33] text-[#e8eaf0] rounded px-3 py-1.5 focus:outline-none"
          >
            <option value="GSTR-2B (GST Portal)">GSTR-2B (GST Portal)</option>
            <option value="GSTR-2A (GST Portal)">GSTR-2A (GST Portal)</option>
            <option value="Bank Statement (CSV)">Bank Statement (CSV)</option>
          </select>
        </div>
      </div>

      {/* Filter Bar: Period selection + Match status toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-[#111115] border border-[#262a33] rounded-lg">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#8a909c]">Period</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#171a21] border border-[#262a33] text-[#e8eaf0] rounded px-2.5 py-1 focus:outline-none"
          >
            <option value="Sep 2024 (Q2 Filing)">Sep 2024 (Q2 Filing)</option>
            <option value="Aug 2024">Aug 2024</option>
            <option value="Jul 2024">Jul 2024</option>
            <option value="All Periods">All Periods</option>
          </select>
        </div>

        {/* Match status toggle */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'all'
                ? 'bg-[#262a33] text-[#e8eaf0] font-medium'
                : 'text-[#8a909c] hover:text-[#e8eaf0] hover:bg-[#171a21]'
            }`}
          >
            All <span className="tabular-nums">({reconciliationResults.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('matched')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'matched'
                ? 'bg-[#262a33] text-[#3ddc97] font-medium'
                : 'text-[#8a909c] hover:text-[#e8eaf0] hover:bg-[#171a21]'
            }`}
          >
            Matched <span className="tabular-nums">({matchedPairs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('suggestions')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'suggestions'
                ? 'bg-[#262a33] text-[#f5b754] font-medium'
                : 'text-[#8a909c] hover:text-[#e8eaf0] hover:bg-[#171a21]'
            }`}
          >
            Suggestions <span className="tabular-nums">({suggestions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('exceptions')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'exceptions'
                ? 'bg-[#262a33] text-[#ff5c5c] font-medium'
                : 'text-[#8a909c] hover:text-[#e8eaf0] hover:bg-[#171a21]'
            }`}
          >
            Exceptions <span className="tabular-nums">({unmatchedExceptions.length})</span>
          </button>
        </div>
      </div>

      {/* Batch / Summary Header Metrics: 4 Flat cards, no neon gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Total Books (Source A)</div>
          <div className="text-xl font-semibold text-[#e8eaf0] tabular-nums">
            {formatPaiseToINR(summary.totalBooksPaise)}
          </div>
          <div className="text-xs text-[#8a909c] mt-1 tabular-nums">
            {summary.totalBooksCount} records • {summary.totalBooksPaise} paise
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Total Portal (Source B)</div>
          <div className="text-xl font-semibold text-[#e8eaf0] tabular-nums">
            {formatPaiseToINR(summary.totalPortalPaise)}
          </div>
          <div className="text-xs text-[#8a909c] mt-1 tabular-nums">
            {summary.totalPortalCount} records • {summary.totalPortalPaise} paise
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Matched automatically</div>
          <div className="text-xl font-semibold text-[#3ddc97] tabular-nums">
            {formatPaiseToINR(summary.matchedPaise)}
          </div>
          <div className="text-xs text-[#8a909c] mt-1 tabular-nums">
            {summary.matchedCount} verified matches • 100% paise exact
          </div>
        </div>

        <div 
          onClick={onNavigateToExceptions}
          className="p-4 rounded-lg bg-[#161920] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">At-risk ITC (Sec 16(2)(aa))</div>
          <div className="text-xl font-semibold text-[#f5b754] tabular-nums">
            {formatPaiseToINR(summary.atRiskItcPaise)}
          </div>
          <div className="text-xs text-[#8a909c] mt-1 tabular-nums">
            {summary.unmatchedExceptionsCount} exceptions require CA action
          </div>
        </div>
      </div>

      {/* Side-by-Side Sources Header */}
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-[#8a909c] px-3 pt-4 border-t border-[#262a33]">
        <div className="flex items-center justify-between">
          <span>SOURCE A: {sourceA}</span>
          <span className="font-normal tabular-nums">{booksDataset.length} records</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SOURCE B: {sourceB}</span>
          <span className="font-normal tabular-nums">{portalDataset.length} records</span>
        </div>
      </div>

      {/* SECTION 1: MATCH SUGGESTIONS (Amber Banner if confidence < 0.85) */}
      {(statusFilter === 'all' || statusFilter === 'suggestions') && suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#f5b754] px-1 font-medium">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#f5b754]" />
              Match Suggestions ({suggestions.length} items require confirmation)
            </span>
            <span className="text-[11px] text-[#8a909c]">Confidence &lt; 85%</span>
          </div>

          <div className="space-y-3">
            {suggestions.map((item) => {
              const book = item.bookRecord!;
              const portal = item.portalRecord!;
              return (
                <div 
                  key={item.id} 
                  className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-900/40 text-amber-200 border border-amber-500/40 font-medium">
                        {item.matchRule || 'Match Suggestion'}
                      </span>
                      <span className="text-xs text-amber-200/80 tabular-nums">
                        {Math.round(item.confidenceScore * 100)}% Confidence
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveSuggestion(item.id)}
                        className="px-3 py-1.5 rounded text-xs bg-[#3ddc97] text-[#0a0a0c] font-medium hover:bg-[#32c484] flex items-center gap-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Match
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSuggestion(item.id)}
                        className="px-3 py-1.5 rounded text-xs bg-[#171a21] border border-[#262a33] text-[#e8eaf0] hover:bg-[#262a33] flex items-center gap-1 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded bg-[#0f1115] border border-[#262a33] space-y-1">
                      <div className="text-[#8a909c] font-medium">Source A: Books Record</div>
                      <div className="text-[#e8eaf0] font-medium">{book.vendorName}</div>
                      <div className="text-[#8a909c]">GSTIN: {book.vendorGSTIN}</div>
                      <div className="text-[#e8eaf0]">Invoice: {book.invoiceNumber}</div>
                      <div className="text-[#8a909c]">Date: {book.invoiceDate}</div>
                      <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">
                        {formatPaiseToINR(parseToPaise(book.totalAmount))}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#0f1115] border border-[#262a33] space-y-1">
                      <div className="text-[#8a909c] font-medium">Source B: Portal Record</div>
                      <div className="text-[#e8eaf0] font-medium">{portal.supplierTradeName}</div>
                      <div className="text-[#8a909c]">GSTIN: {portal.supplierGSTIN}</div>
                      <div className="text-[#e8eaf0]">Invoice: {portal.invoiceNumber}</div>
                      <div className="text-[#8a909c]">Date: {portal.invoiceDate}</div>
                      <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">
                        {formatPaiseToINR(parseToPaise(portal.invoiceValue))}
                      </div>
                    </div>
                  </div>

                  {/* Audit Rationale */}
                  <div className="text-xs text-amber-200/90 pt-1 flex items-start gap-1.5">
                    <span className="font-medium shrink-0">Rationale:</span>
                    <span>{item.auditRationale}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: RECONCILED PAIRS (Collapsed into High-Contrast Green Lines) */}
      {(statusFilter === 'all' || statusFilter === 'matched') && (
        <div className="space-y-2">
          <div className="text-xs text-[#3ddc97] font-medium px-2 py-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#3ddc97]" />
              Collapsed Reconciled Pairs ({matchedPairs.length} Verified)
            </span>
            <span className="text-[11px] text-[#8a909c]">Click line to expand proof</span>
          </div>

          <div className="border border-[#262a33] rounded-lg divide-y divide-[#262a33] bg-[#0f1115] overflow-hidden">
            {matchedPairs.map((item) => {
              const isExpanded = !!expandedRows[item.id];
              const book = item.bookRecord!;
              const portal = item.portalRecord!;
              const amountINR = formatPaiseToINR(parseToPaise(book.totalAmount));

              return (
                <div key={item.id} className="transition">
                  {/* High-contrast green collapsed line */}
                  <div
                    onClick={() => toggleRow(item.id)}
                    className="p-3 cursor-pointer bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-sm bg-emerald-400 shrink-0" />
                      <span className="font-medium text-[#e8eaf0] truncate">
                        {book.vendorName}
                      </span>
                      <span className="text-[#8a909c] hidden sm:inline">
                        • Inv {book.invoiceNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-900/30 text-emerald-300 border border-emerald-600/30 hidden md:inline shrink-0">
                        {item.matchRule}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-medium text-[#e8eaf0] tabular-nums">
                        {amountINR}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Matched
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#8a909c]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#8a909c]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded side-by-side inspection grid */}
                  {isExpanded && (
                    <div className="p-4 bg-[#171a21] border-t border-[#262a33] space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Source A Details */}
                        <div className="p-3 rounded bg-[#0f1115] border border-[#262a33] space-y-1">
                          <span className="text-[#8a909c] block font-medium">Source A: Books Record</span>
                          <div className="text-[#e8eaf0]">Vendor: {book.vendorName}</div>
                          <div className="text-[#8a909c]">GSTIN: {book.vendorGSTIN}</div>
                          <div className="text-[#e8eaf0]">Invoice: {book.invoiceNumber}</div>
                          <div className="text-[#e8eaf0]">Date: {book.invoiceDate}</div>
                          <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">
                            {formatPaiseToINR(parseToPaise(book.totalAmount))}
                          </div>
                          <div className="text-[11px] text-[#8a909c]">
                            Taxable: {formatPaiseToINR(parseToPaise(book.taxableValue))} | CGST: {formatPaiseToINR(parseToPaise(book.cgst))} | SGST: {formatPaiseToINR(parseToPaise(book.sgst))}
                          </div>
                        </div>

                        {/* Source B Details */}
                        <div className="p-3 rounded bg-[#0f1115] border border-[#262a33] space-y-1">
                          <span className="text-[#8a909c] block font-medium">Source B: Portal Record</span>
                          <div className="text-[#e8eaf0]">Supplier: {portal.supplierTradeName}</div>
                          <div className="text-[#8a909c]">GSTIN: {portal.supplierGSTIN}</div>
                          <div className="text-[#e8eaf0]">Invoice: {portal.invoiceNumber}</div>
                          <div className="text-[#e8eaf0]">Date: {portal.invoiceDate}</div>
                          <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">
                            {formatPaiseToINR(parseToPaise(portal.invoiceValue))}
                          </div>
                          <div className="text-[11px] text-[#8a909c]">
                            Taxable: {formatPaiseToINR(parseToPaise(portal.taxableValue))} | Central Tax: {formatPaiseToINR(parseToPaise(portal.centralTax))} | State Tax: {formatPaiseToINR(parseToPaise(portal.stateTax))}
                          </div>
                        </div>
                      </div>

                      {/* Audit proof footer */}
                      <div className="pt-2 border-t border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#8a909c]">
                        <div>
                          <span className="text-[#e8eaf0] font-medium">Audit Rationale: </span>
                          {item.auditRationale}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {item.ruleCitation && (
                            <span className="text-[#8a909c]">{item.ruleCitation}</span>
                          )}
                          <span className="text-[#3ddc97] font-medium tabular-nums">
                            Variance: {formatPaiseToINR(item.differencePaise || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: UNMATCHED EXCEPTIONS GROUPED BY ROOT CAUSE */}
      {(statusFilter === 'all' || statusFilter === 'exceptions') && unmatchedExceptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#ff5c5c] px-1 font-medium">
            <span className="flex items-center gap-1.5">
              <FileWarning className="w-4 h-4 shrink-0 text-[#ff5c5c]" />
              Unmatched Exceptions ({unmatchedExceptions.length} records grouped by root cause)
            </span>
            <button
              type="button"
              onClick={onNavigateToExceptions}
              className="text-[11px] text-[#8a909c] hover:text-[#e8eaf0] underline"
            >
              Open in exception triage queue
            </button>
          </div>

          {/* Group 1: Missing in GSTR-2B (Section 16(2)(aa) ITC at risk) */}
          {exceptionsByCause.missing2B.length > 0 && (
            <div className="border border-[#262a33] rounded-lg bg-[#0f1115] overflow-hidden space-y-2 p-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#262a33]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-red-950/50 text-red-400 border border-red-500/30 font-medium">
                    Missing in GSTR-2B (ITC At Risk)
                  </span>
                  <span className="text-[#8a909c]">
                    Section 16(2)(aa) CGST Act, 2017
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#ff5c5c] tabular-nums">
                  {exceptionsByCause.missing2B.length} at-risk records
                </span>
              </div>

              <div className="space-y-2">
                {exceptionsByCause.missing2B.map(exc => {
                  const book = exc.bookRecord!;
                  return (
                    <div 
                      key={exc.id}
                      className="p-3 rounded bg-[#171a21] border border-[#262a33] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                    >
                      <div>
                        <span className="text-[#8a909c] block font-medium">Source A: Books Record</span>
                        <div className="text-[#e8eaf0] font-medium">{book.vendorName}</div>
                        <div className="text-[#8a909c]">GSTIN: {book.vendorGSTIN} • Inv {book.invoiceNumber}</div>
                        <div className="text-[#e8eaf0] tabular-nums mt-1 font-semibold">
                          Total: {formatPaiseToINR(parseToPaise(book.totalAmount))}
                        </div>
                        <div className="text-[11px] text-[#ff5c5c] tabular-nums">
                          At-Risk ITC: {formatPaiseToINR(parseToPaise(book.cgst + book.sgst + book.igst))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between p-2 rounded bg-[#0f1115] border border-red-950/40 text-red-300">
                        <div>
                          <span className="text-[#8a909c] block font-medium">Source B: Portal Status</span>
                          <p className="mt-1">
                            Not reflecting in supplier&apos;s GSTR-1 or GSTR-2B.
                          </p>
                        </div>
                        <div className="text-[11px] text-[#8a909c] pt-2">
                          Statutory Notice: ITC cannot be claimed under Sec 16(2)(aa) until supplier files return.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 2: Rate Mismatches / Amount Discrepancies */}
          {exceptionsByCause.rateMismatches.length > 0 && (
            <div className="border border-[#262a33] rounded-lg bg-[#0f1115] overflow-hidden space-y-2 p-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#262a33]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-amber-950/50 text-amber-400 border border-amber-500/30 font-medium">
                    Tax Rate / Amount Discrepancy
                  </span>
                  <span className="text-[#8a909c]">Section 16(2)(c) CGST Act</span>
                </div>
                <span className="text-xs font-semibold text-[#f5b754] tabular-nums">
                  {exceptionsByCause.rateMismatches.length} records
                </span>
              </div>

              <div className="space-y-2">
                {exceptionsByCause.rateMismatches.map(exc => {
                  const book = exc.bookRecord!;
                  const portal = exc.portalRecord!;
                  return (
                    <div 
                      key={exc.id}
                      className="p-3 rounded bg-[#171a21] border border-[#262a33] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                    >
                      <div>
                        <span className="text-[#8a909c] block font-medium">Source A: Books Record</span>
                        <div className="text-[#e8eaf0] font-medium">{book.vendorName}</div>
                        <div className="text-[#8a909c]">Inv: {book.invoiceNumber} • Date: {book.invoiceDate}</div>
                        <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums mt-1">
                          Booked: {formatPaiseToINR(parseToPaise(book.totalAmount))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[#8a909c] block font-medium">Source B: Portal Record</span>
                        <div className="text-[#e8eaf0] font-medium">{portal.supplierTradeName}</div>
                        <div className="text-[#8a909c]">Inv: {portal.invoiceNumber} • Date: {portal.invoiceDate}</div>
                        <div className="text-sm font-semibold text-[#f5b754] tabular-nums mt-1">
                          Filed: {formatPaiseToINR(parseToPaise(portal.invoiceValue))}
                        </div>
                        <div className="text-[11px] text-[#ff5c5c] tabular-nums mt-0.5">
                          Delta: {formatPaiseToINR(exc.differencePaise || 0)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 3: Missing in Books (Unclaimed Purchases) */}
          {exceptionsByCause.missingBooks.length > 0 && (
            <div className="border border-[#262a33] rounded-lg bg-[#0f1115] overflow-hidden space-y-2 p-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#262a33]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-950/50 text-blue-400 border border-blue-500/30 font-medium">
                    Unclaimed in Books
                  </span>
                  <span className="text-[#8a909c]">Input Tax Credit Discovery</span>
                </div>
                <span className="text-xs font-semibold text-[#e8eaf0] tabular-nums">
                  {exceptionsByCause.missingBooks.length} records
                </span>
              </div>

              <div className="space-y-2">
                {exceptionsByCause.missingBooks.map(exc => {
                  const portal = exc.portalRecord!;
                  return (
                    <div 
                      key={exc.id}
                      className="p-3 rounded bg-[#171a21] border border-[#262a33] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                    >
                      <div className="p-2 rounded bg-[#0f1115] border border-[#262a33]">
                        <span className="text-[#8a909c] block font-medium">Source A: Books Status</span>
                        <div className="text-[#8a909c] mt-1">
                          No matching purchase entry found in client books.
                        </div>
                      </div>

                      <div>
                        <span className="text-[#8a909c] block font-medium">Source B: Portal Record</span>
                        <div className="text-[#e8eaf0] font-medium">{portal.supplierTradeName}</div>
                        <div className="text-[#8a909c]">GSTIN: {portal.supplierGSTIN} • Inv {portal.invoiceNumber}</div>
                        <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums mt-1">
                          Value: {formatPaiseToINR(parseToPaise(portal.invoiceValue))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action banner linking to Exception Queue */}
      <div className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium text-[#e8eaf0]">
            {unmatchedExceptions.length} exceptions require human sign-off
          </h4>
          <p className="text-xs text-[#8a909c] mt-0.5">
            Timing differences, rate mismatches, and unfiled vendor invoices segregated in the exception queue.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToExceptions}
          className="cockpit-btn primary text-xs py-2 px-3.5 shrink-0"
        >
          Open exceptions queue
        </button>
      </div>
    </div>
  );
};
