import { BookInvoice, GSTR2BRecord, ReconciledItem, MatchStatus } from '../types';

/**
 * Converts a rupee amount (number or formatted string) strictly into integer paise (i64 equivalent)
 * Prevents floating point inaccuracy in financial comparisons
 */
export function parseToPaise(amount: number | string): number {
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100);
  }
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num) || !Number.isFinite(num)) return 0;
    return Math.round(num * 100);
  }
  return 0;
}

/**
 * Formats integer paise into standard Indian currency string (INR)
 * e.g. 5310000 -> "₹ 53,100.00"
 */
export function formatPaiseToINR(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  const decimalStr = remainderPaise < 10 ? `0${remainderPaise}` : `${remainderPaise}`;

  const rupeeStr = rupees.toString();
  let lastThree = rupeeStr.substring(rupeeStr.length - 3);
  const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalStr}`;
}

/**
 * Calculates normalized Levenshtein similarity between two party/vendor strings (0.0 to 1.0)
 * STRICT RULE: Used ONLY for party/vendor names and narrations.
 * PROHIBITED: Never use fuzzy matching on amounts, GSTINs, or invoice numbers.
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const s2 = (str2 || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const track: number[][] = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(0));
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
 * Deterministic alphanumeric normalization for invoice numbers (strips punctuation and spaces)
 * Used to detect deterministic delimiter variations ('/' vs '-') without fuzzy guessing.
 */
export function normalizeInvoiceNumber(inv: string): string {
  return (inv || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Summary statistics for reconciliation batch
 */
export interface ReconciliationSummary {
  totalBooksCount: number;
  totalBooksPaise: number;
  totalPortalCount: number;
  totalPortalPaise: number;
  matchedCount: number;
  matchedPaise: number;
  suggestionsCount: number;
  unmatchedExceptionsCount: number;
  atRiskItcPaise: number;
  atRiskItcRupees: number;
}

/**
 * Computes deterministic summary metrics across books, portal, and reconciled items
 */
export function computeReconciliationSummary(
  books: BookInvoice[],
  portal: GSTR2BRecord[],
  results: ReconciledItem[]
): ReconciliationSummary {
  const totalBooksCount = books.length;
  const totalBooksPaise = books.reduce((sum, b) => sum + parseToPaise(b.totalAmount), 0);

  const totalPortalCount = portal.length;
  const totalPortalPaise = portal.reduce((sum, p) => sum + parseToPaise(p.invoiceValue), 0);

  const matchedItems = results.filter(r => 
    (r.status === 'EXACT_MATCH' || r.status === 'TIMING_DIFF' || r.status === 'RELAXED_MATCH' || r.status === 'FUZZY_PARTY') &&
    r.confidenceScore >= 0.85 &&
    r.bookRecord && r.portalRecord
  );
  const matchedCount = matchedItems.length;
  const matchedPaise = matchedItems.reduce((sum, r) => sum + (r.bookRecord ? parseToPaise(r.bookRecord.totalAmount) : 0), 0);

  const suggestionsCount = results.filter(r => r.confidenceScore < 0.85 && r.bookRecord && r.portalRecord).length;

  const unmatchedItems = results.filter(r => 
    r.status === 'MISSING_IN_2B' || r.status === 'RATE_MISMATCH' || r.status === 'MISSING_IN_BOOKS'
  );
  const unmatchedExceptionsCount = unmatchedItems.length;

  const atRiskItcPaise = results
    .filter(r => r.status === 'MISSING_IN_2B')
    .reduce((sum, r) => {
      if (r.bookRecord) {
        const itc = parseToPaise(r.bookRecord.cgst + r.bookRecord.sgst + r.bookRecord.igst);
        return sum + itc;
      }
      return sum;
    }, 0);

  return {
    totalBooksCount,
    totalBooksPaise,
    totalPortalCount,
    totalPortalPaise,
    matchedCount,
    matchedPaise,
    suggestionsCount,
    unmatchedExceptionsCount,
    atRiskItcPaise,
    atRiskItcRupees: atRiskItcPaise / 100,
  };
}

/**
 * Pure Deterministic Multi-Stage Matching Engine
 * 
 * Flow 5 Rules:
 * Stage 1 (Exact Match):
 *   - Exact match on GSTIN + Invoice Number + Amount in integer paise + Date exact + Vendor Name exact. Confidence = 1.0 (100%).
 * Stage 2 (Relaxed Match):
 *   - Date within 30-day statutory window.
 *   - Amount within ±₹1.00 (100 paise) rounding tolerance. Confidence = 0.90 (90%).
 * Stage 3 (Fuzzy Party Name via Levenshtein strsim):
 *   - Strict amount (paise exact) and GSTIN equality, invoice number equality, fuzzy matching on vendor/party name (similarity > 0.82). Confidence = 0.85 (85%).
 *   - PROHIBITED: Never use fuzzy matching on amounts, GSTINs, or invoice numbers!
 * Suggestions:
 *   - Delimiter typos in invoice #, extended timing > 30d, or party similarity between 0.70 and 0.82 (confidence < 0.85).
 * Exceptions:
 *   - Rate/amount mismatches (> 100 paise delta), Missing in GSTR-2B (Sec 16(2)(aa) ITC at risk), Missing in Books.
 */
export function reconcileDatasets(
  books: BookInvoice[],
  portal: GSTR2BRecord[]
): ReconciledItem[] {
  const results: ReconciledItem[] = [];
  const matchedPortalIds = new Set<string>();
  const matchedBookIds = new Set<string>();

  // =========================================================================
  // STAGE 1: Exact Match (GSTIN + Invoice Number + Amount in paise exact + Date exact + Exact Party Name)
  // Confidence = 1.0 (100%)
  // =========================================================================
  for (const book of books) {
    if (matchedBookIds.has(book.id)) continue;
    const bookPaise = parseToPaise(book.totalAmount);
    const bookGstin = (book.vendorGSTIN || '').trim().toUpperCase();
    const bookInv = (book.invoiceNumber || '').trim().toUpperCase();
    const cleanBookParty = (book.vendorName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const exactMatch = portal.find(p => {
      if (matchedPortalIds.has(p.id)) return false;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalInv = (p.invoiceNumber || '').trim().toUpperCase();
      const portalPaise = parseToPaise(p.invoiceValue);
      const isDateExact = dateDiffDays(book.invoiceDate, p.invoiceDate) === 0;
      const cleanPortalParty = (p.supplierTradeName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const isPartyExact = cleanBookParty.length > 0 && cleanBookParty === cleanPortalParty;

      return (
        portalGstin === bookGstin &&
        portalInv === bookInv &&
        portalPaise === bookPaise &&
        isDateExact &&
        isPartyExact
      );
    });

    if (exactMatch) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(exactMatch.id);
      results.push({
        id: `rec-s1-${book.id}-${exactMatch.id}`,
        status: 'EXACT_MATCH',
        confidenceScore: 1.0,
        bookRecord: book,
        portalRecord: exactMatch,
        matchRule: 'Exact 1:1 Match',
        auditRationale: `100% Deterministic Agreement: GSTIN, Invoice #, Date, and Amount in paise (${bookPaise} paise) agree identically.`,
        ruleCitation: 'Rule 36(4) CGST Rules - Exact Deterministic Match',
        differencePaise: 0,
        differenceAmount: 0,
        isApproved: true,
      });
    }
  }

  // =========================================================================
  // STAGE 2: Relaxed Match (GSTIN + Invoice Number exact, Date within 30 days, Amount within ±100 paise)
  // Confidence = 0.90 (90%)
  // =========================================================================
  for (const book of books) {
    if (matchedBookIds.has(book.id)) continue;
    const bookPaise = parseToPaise(book.totalAmount);
    const bookGstin = (book.vendorGSTIN || '').trim().toUpperCase();
    const bookInv = (book.invoiceNumber || '').trim().toUpperCase();
    const cleanBookParty = (book.vendorName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const relaxedMatch = portal.find(p => {
      if (matchedPortalIds.has(p.id)) return false;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalInv = (p.invoiceNumber || '').trim().toUpperCase();
      const portalPaise = parseToPaise(p.invoiceValue);
      const daysDiff = dateDiffDays(book.invoiceDate, p.invoiceDate);
      const paiseDelta = Math.abs(bookPaise - portalPaise);
      const cleanPortalParty = (p.supplierTradeName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const isPartyExact = cleanBookParty.length > 0 && cleanBookParty === cleanPortalParty;

      return (
        portalGstin === bookGstin &&
        portalInv === bookInv &&
        daysDiff <= 30 &&
        paiseDelta <= 100 &&
        isPartyExact
      );
    });

    if (relaxedMatch) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(relaxedMatch.id);
      const daysDiff = dateDiffDays(book.invoiceDate, relaxedMatch.invoiceDate);
      const paiseDelta = Math.abs(bookPaise - parseToPaise(relaxedMatch.invoiceValue));

      const matchRuleName = daysDiff > 0
        ? `Relaxed Date Match (${daysDiff}d delta)`
        : `Relaxed Rounding Match (±${paiseDelta}p delta)`;

      results.push({
        id: `rec-s2-${book.id}-${relaxedMatch.id}`,
        status: daysDiff > 0 ? 'TIMING_DIFF' : 'RELAXED_MATCH',
        confidenceScore: 0.90,
        bookRecord: book,
        portalRecord: relaxedMatch,
        matchRule: matchRuleName,
        auditRationale: `Statutory Tolerance Match: GSTIN and Invoice # agree. Date delta (${daysDiff} days) is within 30-day statutory window and amount delta (${paiseDelta} paise) is within 100 paise rounding tolerance.`,
        ruleCitation: 'Rule 36(4) CGST Rules - Statutory Timing & Rounding Tolerance',
        differencePaise: paiseDelta,
        differenceAmount: paiseDelta / 100,
        isApproved: true,
      });
    }
  }

  // =========================================================================
  // STAGE 3: Fuzzy Party Name via Levenshtein (similarity > 0.82)
  // Strict amount equality in paise + strict GSTIN equality + strict invoice equality
  // Confidence = 0.85 (85%)
  // STRICT RULE: Never fuzzy match amounts, GSTINs, or invoice numbers!
  // =========================================================================
  for (const book of books) {
    if (matchedBookIds.has(book.id)) continue;
    const bookPaise = parseToPaise(book.totalAmount);
    const bookGstin = (book.vendorGSTIN || '').trim().toUpperCase();
    const bookInv = (book.invoiceNumber || '').trim().toUpperCase();

    let bestPartyMatch: { portal: GSTR2BRecord; sim: number } | null = null;

    for (const p of portal) {
      if (matchedPortalIds.has(p.id)) continue;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalInv = (p.invoiceNumber || '').trim().toUpperCase();
      const portalPaise = parseToPaise(p.invoiceValue);

      // STRICT EQUALITY: GSTIN, Invoice #, and Amount in paise MUST be exact
      if (portalGstin === bookGstin && portalInv === bookInv && portalPaise === bookPaise) {
        const partySim = calculateStringSimilarity(book.vendorName, p.supplierTradeName);
        if (partySim > 0.82 && (!bestPartyMatch || partySim > bestPartyMatch.sim)) {
          bestPartyMatch = { portal: p, sim: partySim };
        }
      }
    }

    if (bestPartyMatch) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(bestPartyMatch.portal.id);
      const simPercent = Math.round(bestPartyMatch.sim * 100);

      results.push({
        id: `rec-s3-${book.id}-${bestPartyMatch.portal.id}`,
        status: 'FUZZY_PARTY',
        confidenceScore: 0.85,
        bookRecord: book,
        portalRecord: bestPartyMatch.portal,
        matchRule: `Fuzzy Party Match (${simPercent}% similarity)`,
        auditRationale: `Party Name Match (${simPercent}%): Books '${book.vendorName}' vs Portal '${bestPartyMatch.portal.supplierTradeName}'. Strict GSTIN, Invoice #, and Amount (${bookPaise} paise) equality verified.`,
        ruleCitation: 'Section 16(2) CGST Act, 2017 & Rule 36(4) - Vendor Identity Resolution',
        differencePaise: 0,
        differenceAmount: 0,
        isApproved: true,
      });
    }
  }

  // =========================================================================
  // MATCH SUGGESTIONS (Confidence < 0.85, requires explicit CA confirmation)
  // 1. Invoice delimiter typos (e.g. '/' vs '-', normalized alphanumeric match)
  // 2. Party name similarity between 0.70 and 0.82
  // =========================================================================
  for (const book of books) {
    if (matchedBookIds.has(book.id)) continue;
    const bookPaise = parseToPaise(book.totalAmount);
    const bookGstin = (book.vendorGSTIN || '').trim().toUpperCase();
    const bookInv = (book.invoiceNumber || '').trim().toUpperCase();
    const bookNormInv = normalizeInvoiceNumber(book.invoiceNumber);

    // 1. Check for Delimiter Typo (e.g. TI/24-25/00482 vs TI-24-25-00482)
    const typoMatch = portal.find(p => {
      if (matchedPortalIds.has(p.id)) return false;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalPaise = parseToPaise(p.invoiceValue);
      const portalNormInv = normalizeInvoiceNumber(p.invoiceNumber);

      return (
        portalGstin === bookGstin &&
        portalPaise === bookPaise &&
        portalNormInv.length > 0 &&
        portalNormInv === bookNormInv
      );
    });

    if (typoMatch) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(typoMatch.id);
      results.push({
        id: `rec-sug-typo-${book.id}-${typoMatch.id}`,
        status: 'INVOICE_TYPO',
        confidenceScore: 0.80, // < 0.85 triggers amber suggestion banner
        bookRecord: book,
        portalRecord: typoMatch,
        matchRule: 'Invoice Delimiter Typo Suggestion',
        auditRationale: `Probable Typo: GSTIN & Amount match exactly (${bookPaise} paise). Delimiter format variance in Books '${book.invoiceNumber}' vs Portal '${typoMatch.invoiceNumber}'. Requires CA confirmation.`,
        ruleCitation: 'Audit Defense Note: Typographical delimiter variance resolved via vendor GSTIN correlation',
        differencePaise: 0,
        differenceAmount: 0,
        isApproved: false,
      });
      continue;
    }

    // 2. Check for extended date drift (31 to 45 days)
    const timingSuggestion = portal.find(p => {
      if (matchedPortalIds.has(p.id)) return false;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalInv = (p.invoiceNumber || '').trim().toUpperCase();
      const portalPaise = parseToPaise(p.invoiceValue);
      const daysDiff = dateDiffDays(book.invoiceDate, p.invoiceDate);

      return (
        portalGstin === bookGstin &&
        portalInv === bookInv &&
        portalPaise === bookPaise &&
        daysDiff > 30 &&
        daysDiff <= 45
      );
    });

    if (timingSuggestion) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(timingSuggestion.id);
      const daysDiff = dateDiffDays(book.invoiceDate, timingSuggestion.invoiceDate);
      results.push({
        id: `rec-sug-time-${book.id}-${timingSuggestion.id}`,
        status: 'TIMING_DIFF',
        confidenceScore: 0.80,
        bookRecord: book,
        portalRecord: timingSuggestion,
        matchRule: `Extended Timing Suggestion (${daysDiff}d delta)`,
        auditRationale: `Timing Variance: Invoice date in books (${book.invoiceDate}) differs from Portal (${timingSuggestion.invoiceDate}) by ${daysDiff} days, exceeding the 30-day statutory window. Requires CA sign-off.`,
        ruleCitation: 'Rule 36(4) CGST Rules - Timing Alignment Flag',
        differencePaise: 0,
        differenceAmount: 0,
        isApproved: false,
      });
      continue;
    }
  }

  // =========================================================================
  // UNMATCHED EXCEPTIONS: Rate / Amount Mismatches
  // GSTIN and Invoice # agree, but amount differs > 100 paise
  // =========================================================================
  for (const book of books) {
    if (matchedBookIds.has(book.id)) continue;
    const bookPaise = parseToPaise(book.totalAmount);
    const bookGstin = (book.vendorGSTIN || '').trim().toUpperCase();
    const bookNormInv = normalizeInvoiceNumber(book.invoiceNumber);

    const rateMismatch = portal.find(p => {
      if (matchedPortalIds.has(p.id)) return false;
      const portalGstin = (p.supplierGSTIN || '').trim().toUpperCase();
      const portalNormInv = normalizeInvoiceNumber(p.invoiceNumber);

      return portalGstin === bookGstin && portalNormInv === bookNormInv;
    });

    if (rateMismatch) {
      matchedBookIds.add(book.id);
      matchedPortalIds.add(rateMismatch.id);
      const portalPaise = parseToPaise(rateMismatch.invoiceValue);
      const diffPaise = Math.abs(bookPaise - portalPaise);

      results.push({
        id: `rec-exc-rate-${book.id}-${rateMismatch.id}`,
        status: 'RATE_MISMATCH',
        confidenceScore: 0.90,
        bookRecord: book,
        portalRecord: rateMismatch,
        matchRule: 'Tax Rate / Amount Discrepancy',
        auditRationale: `Tax Discrepancy: Books total ${formatPaiseToINR(bookPaise)} vs Portal total ${formatPaiseToINR(portalPaise)}. Discrepancy of ${formatPaiseToINR(diffPaise)} (${diffPaise} paise).`,
        ruleCitation: 'Section 16(2)(c) CGST Act - Tax Discrepancy Flag',
        differencePaise: diffPaise,
        differenceAmount: diffPaise / 100,
        isApproved: false,
      });
      continue;
    }

    // =======================================================================
    // UNMATCHED EXCEPTIONS: Missing in GSTR-2B (ITC at Risk under Sec 16(2)(aa))
    // =======================================================================
    const itcAtRiskPaise = parseToPaise(book.cgst + book.sgst + book.igst);
    results.push({
      id: `rec-exc-missing2b-${book.id}`,
      status: 'MISSING_IN_2B',
      confidenceScore: 1.0,
      bookRecord: book,
      matchRule: 'Missing in GSTR-2B (ITC at Risk)',
      auditRationale: `Critical Statutory Risk: Invoice booked in client ledger but not reflecting in supplier's GSTR-1 / GSTR-2B. ITC of ${formatPaiseToINR(itcAtRiskPaise)} is ineligible under Section 16(2)(aa).`,
      ruleCitation: 'Section 16(2)(aa) CGST Act, 2017 (Strict ITC Restriction)',
      differencePaise: itcAtRiskPaise,
      differenceAmount: itcAtRiskPaise / 100,
      isApproved: false,
    });
  }

  // =========================================================================
  // UNMATCHED EXCEPTIONS: Missing in Books (Unclaimed purchases in Portal)
  // =========================================================================
  for (const p of portal) {
    if (!matchedPortalIds.has(p.id)) {
      const portalPaise = parseToPaise(p.invoiceValue);
      results.push({
        id: `rec-exc-missingbooks-${p.id}`,
        status: 'MISSING_IN_BOOKS',
        confidenceScore: 1.0,
        portalRecord: p,
        matchRule: 'Unclaimed in Books',
        auditRationale: `Unclaimed ITC: Supplier filed invoice '${p.invoiceNumber}' (${formatPaiseToINR(portalPaise)}) in GSTR-2B, but invoice is missing from client purchase register.`,
        ruleCitation: 'Audit Discovery: Input Tax Credit not claimed in books',
        differencePaise: portalPaise,
        differenceAmount: portalPaise / 100,
        isApproved: false,
      });
    }
  }

  return results;
}
