export interface StatutoryRuleDefinition {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string;
  sourceAuthority: string;
  verified: boolean;
  legalText: string;
  guidanceNote: string;
}

export const STATUTORY_RULES: Record<string, StatutoryRuleDefinition> = {
  "SEC-16-2-AA": {
    id: "SEC-16-2-AA",
    name: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
    effectiveFrom: "01/01/2022",
    effectiveTo: "Present",
    sourceAuthority: "Finance Act, 2021 / CBIC Notification No. 39/2021-CT & Circular 170/02/2022-GST",
    verified: true,
    legalText: "No registered person shall be entitled to the credit of any input tax in respect of any supply of goods or services or both to him unless the details of the invoice or debit note referred to in clause (a) have been furnished by the supplier in the statement of outward supplies and such details have been communicated to the recipient of such invoice or debit note in the manner specified under section 37.",
    guidanceNote: "Input Tax Credit (ITC) can only be availed if invoice details are reflected in the recipient's auto-generated GSTR-2B. Where an invoice is uploaded with a minor date lag within the statutory return filing window, credit is eligible upon return manifestation."
  },
  "SEC-9-3": {
    id: "SEC-9-3",
    name: "Section 9(3) CGST Act (GTA RCM Notifications 13/2017 & 05/2022)",
    effectiveFrom: "01/07/2017",
    effectiveTo: "Present",
    sourceAuthority: "CBIC Notification No. 13/2017-Central Tax (Rate) as amended by 05/2022-Central Tax (Rate)",
    verified: true,
    legalText: "The Government may, on the recommendations of the Council, by notification, specify categories of supply of goods or services or both, the tax on which shall be paid on reverse charge basis by the recipient of such goods or services or both and all the provisions of this Act shall apply to such recipient as if he is the person liable for paying the tax in relation to the supply of such goods or services or both.",
    guidanceNote: "Services supplied by Goods Transport Agencies (GTAs) to registered corporate recipients are subject to 5% GST under Reverse Charge Mechanism (RCM), unless the transporter provides statutory Annexure V declaring option to discharge tax under forward charge."
  },
  "SEC-16-2-C": {
    id: "SEC-16-2-C",
    name: "Section 16(2)(c) CGST Act & Notification 11/2017-CT(R)",
    effectiveFrom: "01/07/2017",
    effectiveTo: "Present",
    sourceAuthority: "Central Goods and Services Tax Act, 2017 (Act No. 12 of 2017)",
    verified: true,
    legalText: "Subject to the provisions of section 41, the tax charged in respect of such supply has been actually paid to the Government, either in cash or through utilization of input tax credit admissible in respect of the said supply.",
    guidanceNote: "Where the supplier reports a different tax rate (e.g. 12% instead of client's 18% booking), the recipient is legally restricted to claiming only the tax actualized and transmitted to the exchequer until an amended credit note or supplementary invoice is uploaded."
  },
  "SEC-194J": {
    id: "SEC-194J",
    name: "Section 194J & Section 197A Income Tax Act, 1961",
    effectiveFrom: "01/04/2020",
    effectiveTo: "Present",
    sourceAuthority: "Income Tax Act, 1961 (Act No. 43 of 1961) as amended by Finance Act 2020",
    verified: true,
    legalText: "Any person, not being an individual or a Hindu undivided family, who is responsible for paying to a resident any sum by way of fees for professional services, or fees for technical services, shall, at the time of credit of such sum to the account of the payee or at the time of payment thereof in cash or by issue of a cheque or draft or by any other mode, deduct an amount equal to ten per cent (or two per cent for technical services) of such sum as income-tax on income comprised therein.",
    guidanceNote: "Tax withholding at 10% applies to legal counsel and professional retainers exceeding ₹30,000 annually. If the deductee tenders a valid Form 15H/15G or Section 197 certificate, zero withholding may be allowed subject to TRACES verification."
  },
  "SEC-194J-TECH": {
    id: "SEC-194J-TECH",
    name: "Section 194J(1)(b) Fee for Technical Services",
    effectiveFrom: "01/04/2020",
    effectiveTo: "Present",
    sourceAuthority: "Income Tax Act, 1961 / Finance Act, 2020 Section 194J(1) Second Proviso",
    verified: true,
    legalText: "Provided that the deduction under this sub-section shall be equal to two per cent of such sum where the sum is credited or paid for fees for technical services (not being professional services) or royalty where such royalty is in the nature of consideration for sale, distribution or exhibition of cinematographic films.",
    guidanceNote: "Software licensing, enterprise cloud subscriptions, and maintenance contracts constitute technical fees and are eligible for the reduced withholding rate of 2% under the second proviso to Section 194J(1)."
  },
  "SEC-194C": {
    id: "SEC-194C",
    name: "Section 194C Payments to Contractors & Transporters",
    effectiveFrom: "01/06/1972",
    effectiveTo: "Present",
    sourceAuthority: "Income Tax Act, 1961",
    verified: true,
    legalText: "Any person responsible for paying any sum to any resident contractor for carrying out any work (including supply of labour for carrying out any work) in pursuance of a contract between the contractor and a specified person shall deduct an amount equal to one per cent (individual/HUF) or two per cent (other entities) as income-tax.",
    guidanceNote: "Freight and works contracts exceeding ₹30,000 single bill or ₹1,00,000 aggregate require TDS deduction unless the transport contractor owns ten or fewer goods carriages and submits PAN declaration under Section 194C(6)."
  },
  "CIRCULAR-UNVERIFIED-CESS": {
    id: "CIRCULAR-UNVERIFIED-CESS",
    name: "Draft State Freight Surcharge Proposal (Internal Memo)",
    effectiveFrom: "Unscheduled",
    effectiveTo: "Open",
    sourceAuthority: "Draft Discussion Paper / State Commercial Tax Advisory",
    verified: false,
    legalText: "Proposed non-statutory levy on interstate freight corridors for infrastructure maintenance. No official notification has been promulgated under Article 279A.",
    guidanceNote: "UNVERIFIED RULE: Source circular cannot be cryptographically verified. Do not rely on this rule for automated tax conclusions or filing decisions."
  },
  "CIRCULAR-183-TYPO": {
    id: "CIRCULAR-183-TYPO",
    name: "CBIC Circular 183/15/2022-GST (Typographical errors in invoice numbering)",
    effectiveFrom: "27/12/2022",
    effectiveTo: "Present",
    sourceAuthority: "CBIC Circular No. 183/15/2022-GST / Clarification on ITC under Section 16(2)(c)",
    verified: true,
    legalText: "Where the invoice number is wrongly reported in GSTR-1 by the supplier (e.g. slash vs hyphen, missing leading zero), but the tax has been paid and the supply is verified, the input tax credit shall not be denied to the recipient.",
    guidanceNote: "Typographical variations in invoice numbering (such as leading zeros, slashes, or hyphens) where vendor GSTIN and total amounts match exactly are rectifiable under Circular 183/15/2022-GST. Full ITC admissible upon confirmation."
  }
};

export function getStatutoryRule(ruleId?: string): StatutoryRuleDefinition | null {
  if (!ruleId) return null;
  return STATUTORY_RULES[ruleId] || null;
}
