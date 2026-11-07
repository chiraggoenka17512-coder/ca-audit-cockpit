const fs = require('fs');
const filePath = 'src/components/views/ReconciliationView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const bookInsert = `      // Additional Stage 4 test case: Extended timing drift suggestion (35 days delta)
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
    ];`;

const portalInsert = `      // Matches book-voltas with 35 days timing difference (> 30d, <= 45d -> Suggestion)
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
      // Extra portal record missing in books`;

// Replace in books
if (!content.includes('book-voltas')) {
  content = content.replace(
    /voucherType:\s*"Purchase"\s*\r?\n\s*}\s*\r?\n\s*\];\s*\r?\n\s*}, \[\]\);/,
    (match) => `voucherType: "Purchase"\n      },\n${bookInsert}\n  }, []);`
  );
  
  content = content.replace(
    /\/\/\s*Extra portal record missing in books/,
    `${portalInsert}`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated ReconciliationView.tsx with second suggestion');
} else {
  console.log('Already contains book-voltas');
}
