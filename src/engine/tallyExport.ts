import { ReconciledItem } from '../types';

/**
 * Generates official Tally Prime XML import file
 * Compatible with Tally Prime 3.0+ / 4.0+ Purchase Vouchers
 */
export function generateTallyXML(approvedItems: ReconciledItem[], companyName: string = "APEX LOGISTICS PVT LTD"): string {
  const vouchersXml = approvedItems
    .filter(item => item.bookRecord)
    .map(item => {
      const b = item.bookRecord!;
      const dateFormatted = b.invoiceDate.replace(/-/g, ''); // YYYYMMDD
      const narration = `Inv ${b.invoiceNumber} dtd ${b.invoiceDate} from ${b.vendorName} [Verified via CA Audit Cockpit]`;

      return `
    <VOUCHER VCHTYPE="Purchase" ACTION="Create">
      <DATE>${dateFormatted}</DATE>
      <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
      <REFERENCE>${b.invoiceNumber}</REFERENCE>
      <PARTYLEDGERNAME>${escapeXml(b.vendorName)}</PARTYLEDGERNAME>
      <NARRATION>${escapeXml(narration)}</NARRATION>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(b.vendorName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${b.totalAmount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(b.assignedLedger || "Purchase Accounts")}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${b.taxableValue.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      ${b.cgst > 0 ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Input CGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${b.cgst.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ''}
      ${b.sgst > 0 ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Input SGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${b.sgst.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ''}
      ${b.igst > 0 ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Input IGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${b.igst.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ''}
    </VOUCHER>`;
    }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${vouchersXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
