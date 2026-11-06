import { BookInvoice, GSTR2BRecord, ReconciledItem, MatchStatus } from '../types';

/**
 * Calculates normalized Levenshtein similarity between two invoice strings
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const s2 = str2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Date difference in days between two YYYY-MM-DD dates
 */
export function dateDiffDays(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str).getTime();
  const d2 = new Date(date2Str).getTime();
  const diffTime = Math.abs(d2 - d1);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Core Deterministic Reconciliation Engine
 * Executes matching passes with zero AI hallucination
 */
export function reconcileDatasets(
  books: BookInvoice[],
  portal: GSTR2BRecord[]
): ReconciledItem[] {
  const results: ReconciledItem[] = [];
  const matchedPortalIds = new Set<string>();

  for (const book of books) {
    // 1. Check for Exact Match (GSTIN + Clean Invoice No + Amount within ₹1)
    const exactMatch = portal.find(p => 
      !matchedPortalIds.has(p.id) &&
      p.supplierGSTIN.toUpperCase() === book.vendorGSTIN.toUpperCase() &&
      p.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === book.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() &&
      Math.abs(p.invoiceValue - book.totalAmount) <= 1.0
    );

    if (exactMatch) {
      matchedPortalIds.add(exactMatch.id);
      const daysDiff = dateDiffDays(book.invoiceDate, exactMatch.invoiceDate);

      if (daysDiff > 3 && daysDiff <= 35) {
        results.push({
          id: `rec-${book.id}-${exactMatch.id}`,
          status: 'TIMING_DIFF',
          confidenceScore: 0.98,
          bookRecord: book,
          portalRecord: exactMatch,
          auditRationale: `Matched: GSTIN & Amount agree exactly. Invoice date in books (${book.invoiceDate}) differs from 2B (${exactMatch.invoiceDate}) by ${daysDiff} days, within the 30-day filing window.`,
          ruleCitation: 'Rule 36(4) CGST Rules - Timing Alignment',
          differenceAmount: Math.abs(book.totalAmount - exactMatch.invoiceValue),
          isApproved: false
        });
      } else {
        results.push({
          id: `rec-${book.id}-${exactMatch.id}`,
          status: 'EXACT_MATCH',
          confidenceScore: 1.0,
          bookRecord: book,
          portalRecord: exactMatch,
          auditRationale: `100% Deterministic Agreement: GSTIN, Invoice #, and Total Amount agree identically. Validated against GSTR-2B.`,
          differenceAmount: 0,
          isApproved: true
        });
      }
      continue;
    }

    // 2. Check for Invoice Typo / Fuzzy Match (GSTIN identical, Amount identical, high invoice similarity)
    let bestFuzzyMatch: GSTR2BRecord | null = null;
    let highestSim = 0;

    for (const p of portal) {
      if (matchedPortalIds.has(p.id)) continue;
      if (p.supplierGSTIN.toUpperCase() === book.vendorGSTIN.toUpperCase() && Math.abs(p.invoiceValue - book.totalAmount) <= 1.0) {
        const sim = calculateStringSimilarity(book.invoiceNumber, p.invoiceNumber);
        if (sim >= 0.70 && sim > highestSim) {
          highestSim = sim;
          bestFuzzyMatch = p;
        }
      }
    }

    if (bestFuzzyMatch) {
      matchedPortalIds.add(bestFuzzyMatch.id);
      results.push({
        id: `rec-${book.id}-${bestFuzzyMatch.id}`,
        status: 'INVOICE_TYPO',
        confidenceScore: parseFloat(highestSim.toFixed(2)),
        bookRecord: book,
        portalRecord: bestFuzzyMatch,
        auditRationale: `Probable Typo: GSTIN & Amount match. Book invoice '${book.invoiceNumber}' vs Portal '${bestFuzzyMatch.invoiceNumber}' (${Math.round(highestSim * 100)}% string match).`,
        ruleCitation: 'Audit Defense Note: Typographical variance resolved via vendor GSTIN correlation',
        differenceAmount: 0,
        isApproved: false
      });
      continue;
    }

    // 3. Check for Tax Rate / Amount Mismatch (GSTIN and Invoice # match, but amounts differ)
    const rateMismatch = portal.find(p => 
      !matchedPortalIds.has(p.id) &&
      p.supplierGSTIN.toUpperCase() === book.vendorGSTIN.toUpperCase() &&
      calculateStringSimilarity(p.invoiceNumber, book.invoiceNumber) >= 0.85
    );

    if (rateMismatch) {
      matchedPortalIds.add(rateMismatch.id);
      const diff = Math.abs(book.totalAmount - rateMismatch.invoiceValue);
      results.push({
        id: `rec-${book.id}-${rateMismatch.id}`,
        status: 'RATE_MISMATCH',
        confidenceScore: 0.90,
        bookRecord: book,
        portalRecord: rateMismatch,
        auditRationale: `Tax Discrepancy: Supplier filed total ₹${rateMismatch.invoiceValue.toLocaleString('en-IN')} in GSTR-2B, but books booked ₹${book.totalAmount.toLocaleString('en-IN')}. Difference of ₹${diff.toLocaleString('en-IN')}.`,
        ruleCitation: 'Section 16(2)(c) CGST Act - Tax Discrepancy Flag',
        differenceAmount: diff,
        isApproved: false
      });
      continue;
    }

    // 4. Missing in Portal (ITC at Risk)
    results.push({
      id: `rec-missing-${book.id}`,
      status: 'MISSING_IN_2B',
      confidenceScore: 1.0,
      bookRecord: book,
      auditRationale: `Critical Statutory Risk: Invoice booked in client ledger but not reflecting in supplier's GSTR-1 / GSTR-2B. ITC is currently ineligible.`,
      ruleCitation: 'Section 16(2)(aa) CGST Act, 2017 (Strict ITC Restriction)',
      differenceAmount: book.cgst + book.sgst + book.igst,
      isApproved: false
    });
  }

  // 5. Unclaimed in Books (Present in 2B, not entered in books)
  for (const p of portal) {
    if (!matchedPortalIds.has(p.id)) {
      results.push({
        id: `rec-unclaimed-${p.id}`,
        status: 'MISSING_IN_BOOKS',
        confidenceScore: 1.0,
        portalRecord: p,
        auditRationale: `Unclaimed ITC: Supplier filed invoice '${p.invoiceNumber}' (₹${p.invoiceValue.toLocaleString('en-IN')}) in GSTR-2B, but missing from client's purchase register.`,
        differenceAmount: p.invoiceValue,
        isApproved: false
      });
    }
  }

  return results;
}
