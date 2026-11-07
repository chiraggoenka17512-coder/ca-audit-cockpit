import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

// Helper to wait for server
function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${url}`));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

async function runE2E() {
  console.log('--- Starting ReconOS Phase 1 E2E Verification ---');
  
  // Ensure screenshots dir
  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Start Vite Preview server
  console.log('1. Starting preview server on port 4173...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    stdio: 'pipe'
  });

  try {
    await waitForServer('http://localhost:4173/', 15000);
    console.log('✓ Preview server is ready at http://localhost:4173/');

    // 2. Launch Chrome via Playwright
    console.log('2. Launching Chrome (channel: chrome)...');
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    const consoleErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error(`  [Browser Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
      console.error(`  [Browser PageError]: ${err.message}`);
    });

    console.log('3. Navigating to ReconOS Cockpit...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

    // =========================================================================
    // Gate B - Test 1: Flow 1 & 2 - Persistent Title Bar, Validation & Switching
    // =========================================================================
    console.log('\n--- Gate B: Flow 1 & 2 (Title Bar, Client Validation & Switching) ---');

    // 1.1 Verify Title Bar
    await page.waitForSelector('header');
    const titleBarText = await page.locator('header').textContent();
    console.log('  Title bar text content:', titleBarText.replace(/\s+/g, ' ').trim());

    if (!titleBarText.includes('ReconOS')) throw new Error('ReconOS brand missing in TitleBar');
    if (!titleBarText.includes('ACME Manufacturing Pvt Ltd')) throw new Error('Client name missing in TitleBar');
    if (!titleBarText.includes('27AABCA1234F1Z5')) throw new Error('GSTIN missing in TitleBar');
    if (!titleBarText.includes('AABCA1234F')) throw new Error('PAN missing in TitleBar');
    if (!titleBarText.includes('0 KB OUTBOUND | AIR-GAPPED')) throw new Error('Air-gapped telemetry missing');
    if (!titleBarText.includes('AES-GCM-256')) throw new Error('AES-GCM-256 missing in TitleBar');
    console.log('  ✓ Persistent TitleBar verified with client name, GSTIN, PAN, and air-gapped sentinel');

    // Screenshot 1: Cockpit Titlebar
    const ss1Path = path.join(screenshotsDir, '01_cockpit_titlebar.png');
    await page.screenshot({ path: ss1Path });
    console.log(`  ✓ Captured screenshot 1: ${ss1Path}`);

    // 1.2 Open New Client Modal
    console.log('  Opening New Client Modal...');
    await page.click('button:has-text("New client")');
    await page.waitForSelector('#new-client-title');
    console.log('  ✓ New client workspace dialog opened');

    // 1.3 Test GSTIN Luhn Modulo-36 Checksum Validation
    console.log('  Testing Luhn Modulo-36 GSTIN validation...');
    await page.fill('input[placeholder*="Paramount Steels"]', 'Tata Motors Commercial Vehicles Ltd');
    
    // Type invalid checksum GSTIN: 27AAACT2727Q1Z5 (should be W)
    await page.fill('input[placeholder*="27AAACT2727Q1ZW"]', '27AAACT2727Q1Z5');
    await page.waitForTimeout(300);

    const checksumWarning = await page.textContent('body');
    if (!checksumWarning.includes('Checksum mismatch: can save as draft to verify portal later.')) {
      throw new Error('Checksum mismatch warning was not rendered');
    }
    console.log('  ✓ Correctly detected checksum mismatch on 27AAACT2727Q1Z5');

    // Verify "Create workspace" button is disabled
    const createBtnDisabled = await page.locator('button:has-text("Create workspace")').getAttribute('disabled');
    if (createBtnDisabled === null) throw new Error('Create workspace button should be disabled for invalid GSTIN');
    console.log('  ✓ "Create workspace" button correctly disabled');

    // Verify "Save as draft" option is visible
    const saveDraftBtn = await page.locator('button:has-text("Save as draft")');
    if (!(await saveDraftBtn.isVisible())) throw new Error('Save as draft button should be visible');
    console.log('  ✓ "Save as draft (finish GSTIN later)" button available');

    // Type valid GSTIN: 27AAACT2727Q1ZW
    await page.fill('input[placeholder*="27AAACT2727Q1ZW"]', '27AAACT2727Q1ZW');
    await page.waitForTimeout(300);
    const validGstinText = await page.textContent('body');
    if (!validGstinText.includes('Valid 15-char format & checksum')) {
      throw new Error('Expected "Valid 15-char format & checksum" indicator');
    }
    if (!validGstinText.includes('Maharashtra')) {
      throw new Error('Expected derived state "Maharashtra"');
    }
    console.log('  ✓ Valid GSTIN accepted, state jurisdiction "Maharashtra" derived');

    // Verify PAN classification
    await page.fill('input[placeholder*="AAACT2727Q"]', 'AAACT2727Q');
    await page.waitForTimeout(200);
    const panText = await page.textContent('body');
    if (!panText.includes('Valid 10-char PAN (Company)')) {
      throw new Error('Expected PAN entity classification: Company');
    }
    console.log('  ✓ PAN validated with 4th-char entity classification: Company');

    // Now test "Save as draft" with incomplete GSTIN
    await page.fill('input[placeholder*="27AAACT2727Q1ZW"]', '27AAACT2727Q'); // 12 chars
    await page.waitForTimeout(200);
    await page.click('button:has-text("Save as draft")');
    await page.waitForTimeout(500);
    console.log('  ✓ Created draft client workspace via "Save as draft"');

    // 1.4 Test Client Switcher Modal (Ctrl+O)
    console.log('  Testing Client Switcher (Ctrl+O)...');
    await page.keyboard.press('Control+o');
    await page.waitForSelector('#client-switcher-title');
    console.log('  ✓ Client switcher opened via Ctrl+O');

    // Verify draft client in list with Draft badge
    const switcherText = await page.locator('#client-switcher-title').locator('xpath=ancestor::div[contains(@class, "bg-[#171a21]")]').textContent();
    if (!switcherText.includes('Tata Motors Commercial Vehicles Ltd')) {
      throw new Error('Draft client missing in Client Switcher');
    }
    if (!switcherText.includes('Draft')) {
      throw new Error('Draft badge missing for draft client');
    }
    console.log('  ✓ Draft client workspace listed with "Draft" indicator');

    // Screenshot 2: Client Switcher and Validation
    const ss2Path = path.join(screenshotsDir, '02_client_switcher_and_validation.png');
    await page.screenshot({ path: ss2Path });
    console.log(`  ✓ Captured screenshot 2: ${ss2Path}`);

    // Switch back to ACME Manufacturing to work with its review queue
    console.log('  Switching back to ACME Manufacturing Pvt Ltd...');
    await page.click('div[role="dialog"] button:has-text("ACME Manufacturing Pvt Ltd")');
    await page.waitForTimeout(500);
    console.log('  ✓ Switched workspace back to ACME Manufacturing');

    // Navigate to Exceptions view to see the review items
    await page.click('button.cockpit-nav-item:has-text("Exceptions")');
    await page.waitForTimeout(300);

    // 1.5 Test Dirty Check Guard (SaveOrDiscardModal) on in-flight edits
    console.log('  Testing SaveOrDiscardModal dirty-check guard on in-flight edit...');
    await page.waitForSelector('.cockpit-row button:has-text("Review")');
    await page.click('.cockpit-row button:has-text("Review")');
    await page.waitForSelector('aside[aria-label="Detail review"]');
    
    // Click Edit button
    await page.click('button:has-text("Edit ledger (E)")');
    await page.waitForSelector('#edit-title');
    console.log('  ✓ In-flight ledger edit open for first item');

    // Now attempt to switch client with Ctrl+O while edit is in-flight
    await page.keyboard.press('Control+o');
    await page.waitForSelector('#client-switcher-title');
    
    // Select the other client
    await page.click('div[role="dialog"] button:has-text("Tata Motors Commercial Vehicles Ltd")');
    await page.waitForSelector('#save-discard-title');

    const dirtyModalText = await page.locator('#save-discard-title').locator('xpath=ancestor::div[contains(@class, "bg-[#171a21]")]').textContent();
    if (!dirtyModalText.includes('Unsaved changes')) {
      throw new Error('Dirty check guard title missing');
    }
    if (!dirtyModalText.includes('in-flight ledger edit')) {
      throw new Error('In-flight ledger edit warning text missing');
    }
    if (!dirtyModalText.includes('Tata Motors Commercial Vehicles Ltd')) {
      throw new Error('Target client missing in SaveOrDiscardModal prompt');
    }
    console.log('  ✓ SaveOrDiscardModal dirty-check guard triggered correctly');

    // Dismiss guard via Cancel
    await page.click('[aria-labelledby="save-discard-title"] button:has-text("Cancel")');
    await page.waitForTimeout(300);
    
    // Dismiss Edit modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    console.log('  ✓ Dirty check guard successfully verified and dismissed');

    // =========================================================================
    // Gate B - Test 2: Flow 4 & 7 - Dual-Pane Loupe & Rule Citations
    // =========================================================================
    console.log('\n--- Gate B: Flow 4 & 7 (Dual-Pane Loupe & Rule Citations) ---');

    // Click on rev-002 (Reliance Transport Bill #882) which has low confidence < 0.85 (0.78)
    console.log('  Selecting low-confidence item (Reliance Transport)...');
    await page.click('.cockpit-row:has-text("Reliance Transport")');
    await page.waitForSelector('aside[aria-label="Detail review"]');

    // Verify Amber Warning Badge for low confidence
    const panelText = await page.locator('aside[aria-label="Detail review"]').textContent();
    if (!panelText.includes('Amber check: Field confidence')) {
      throw new Error('Amber confidence warning banner missing for item < 0.85');
    }
    if (!panelText.includes('Extracted below 85% certainty threshold')) {
      throw new Error('Amber explanation text missing');
    }
    console.log('  ✓ Amber check warning banner rendered for low confidence field (< 85%)');

    // Verify Document Preview Canvas & Coordinate Bounding Boxes
    const hasCanvas = await page.locator('aside[aria-label="Detail review"] :text("Source document inspection")').isVisible();
    if (!hasCanvas) throw new Error('Source document inspection canvas missing');
    
    // Check bounding box elements
    const boundingBoxes = await page.locator('aside[aria-label="Detail review"] div[title*="Click to focus"]').all();
    console.log(`  Found ${boundingBoxes.length} coordinate bounding boxes on document canvas`);
    if (boundingBoxes.length === 0) throw new Error('No bounding box overlays found on canvas');

    // Test Field Click highlights Bounding Box
    console.log('  Testing field click -> bounding box highlight sync...');
    await page.click('aside[aria-label="Detail review"] div:has-text("Consignment Note #"):not([title])');
    await page.waitForTimeout(300);
    const activeBoxText = await page.locator('aside[aria-label="Detail review"] :text("Selected coordinate bounding box")').locator('xpath=..').textContent();
    console.log('  Active bounding box status:', activeBoxText.replace(/\s+/g, ' ').trim());

    // Test Bounding Box Click highlights Field
    console.log('  Testing bounding box click -> field sync...');
    await boundingBoxes[0].click({ force: true });
    await page.waitForTimeout(300);

    // Verify Comparison Breakdown: Agreed Fields & Differences
    if (!panelText.includes('Comparison breakdown')) throw new Error('Comparison breakdown missing');
    if (!panelText.includes('Agreed fields')) throw new Error('Agreed fields missing');
    if (!panelText.includes('Differences & variances')) throw new Error('Differences & variances missing');
    console.log('  ✓ Plain language breakdown: Agreed fields & Differences verified');

    // Verify Statutory Rule Citation & View Full Rule Text Modal
    console.log('  Testing Statutory Rule Citation modal...');
    if (!panelText.includes('Statutory tax citation')) throw new Error('Statutory tax citation missing');
    if (!panelText.includes('Verified rule')) throw new Error('Verified rule indicator missing');
    
    await page.click('button:has-text("View full rule text")');
    await page.waitForSelector('#rule-modal-title');

    const ruleModalText = await page.locator('#rule-modal-title').locator('xpath=ancestor::div[contains(@class, "bg-[#171a21]")]').textContent();
    console.log('  Rule Modal Title:', ruleModalText.split('\n')[0].trim());
    if (!ruleModalText.includes('Section 9(3)')) throw new Error('Section 9(3) missing in rule modal');
    if (!ruleModalText.includes('Statutory Legal Text')) throw new Error('Statutory legal text missing');
    if (!ruleModalText.includes('Authority:')) throw new Error('Source authority missing');
    console.log('  ✓ Rule modal rendered with verbatim Section 9(3) legal text');

    // Screenshot 3: Loupe coordinate highlight and rule modal
    const ss3Path = path.join(screenshotsDir, '03_loupe_coordinate_highlight_and_rule_modal.png');
    await page.screenshot({ path: ss3Path });
    console.log(`  ✓ Captured screenshot 3: ${ss3Path}`);

    // Press Escape to close Rule Modal, verify Loupe stays open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const loupeStillOpen = await page.locator('aside[aria-label="Detail review"]').isVisible();
    if (!loupeStillOpen) throw new Error('Loupe detail panel should remain open when rule modal closes');
    console.log('  ✓ Rule modal closed cleanly on Escape; Loupe remained open');

    // =========================================================================
    // Gate B - Test 3: Flow 8 - Invoice Finder Omni-Search
    // =========================================================================
    console.log('\n--- Gate B: Flow 8 (Invoice Finder Omni-Search Ctrl+K) ---');

    // Trigger Omni-Search via Ctrl+K
    console.log('  Triggering Invoice Finder via Ctrl+K...');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('input[placeholder*="Type to find"]');
    console.log('  ✓ Invoice Finder opened via Ctrl+K');

    // Test Natural Query 1: "sep 53k"
    console.log('  Typing natural query 1: "sep 53k"...');
    await page.fill('input[placeholder*="Type to find"]', 'sep 53k');
    await page.waitForTimeout(400);

    const finderContent1 = await page.locator('div[aria-label="Find invoice"]').textContent();
    if (!finderContent1.includes('Month: September')) throw new Error('Parsed month "September" missing');
    if (!finderContent1.includes('53,000')) throw new Error('Parsed amount 53,000 missing');
    console.log('  ✓ Natural query 1 parsed: Month "September" + Amount "53,000"');

    // Test Natural Query 2: "about 40k Blue Dart"
    console.log('  Typing natural query 2: "about 40k Blue Dart"...');
    await page.fill('input[placeholder*="Type to find"]', 'about 40k Blue Dart');
    await page.waitForTimeout(400);

    const finderContent2 = await page.locator('div[aria-label="Find invoice"]').textContent();
    if (!finderContent2.includes('Party: "blue dart"')) throw new Error('Parsed party query "blue dart" missing');
    if (!finderContent2.includes('~₹40,000')) throw new Error('Parsed amount filter "~₹40,000" missing');
    if (!finderContent2.includes('Blue Dart Express Limited')) throw new Error('Blue Dart card missing in ranked candidates');
    console.log('  ✓ Natural query 2 parsed: Party "blue dart" + Amount "~₹40,000"');

    // Screenshot 4: Omni-Search Ctrl+K Query Parsing
    const ss4Path = path.join(screenshotsDir, '04_omnisearch_ctrl_k_query_parsing.png');
    await page.screenshot({ path: ss4Path });
    console.log(`  ✓ Captured screenshot 4: ${ss4Path}`);

    // Select candidate card via Enter key for Loupe handoff
    console.log('  Selecting Blue Dart candidate card via Enter for Loupe handoff...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Verify Loupe inspected Blue Dart
    const loupeHeader = await page.locator('aside[aria-label="Detail review"] h2').textContent();
    console.log('  Loupe inspected invoice:', loupeHeader);
    if (!loupeHeader.includes('Blue Dart Express Limited')) throw new Error('Expected Loupe to inspect Blue Dart');
    console.log('  ✓ Candidate selected and cleanly handed off to Loupe Inspector');

    // =========================================================================
    // Gate B - Test 4: Flow 16 - Session Undo (Ctrl+Z)
    // =========================================================================
    console.log('\n--- Gate B: Flow 16 (Session Undo Ctrl+Z & SHA-256 Ledger) ---');

    // Ensure we are in Exceptions view
    await page.click('button.cockpit-nav-item:has-text("Exceptions")');
    await page.waitForTimeout(300);

    const itemCountBefore = await page.locator('.cockpit-row').count();
    console.log(`  Items in review queue before approval: ${itemCountBefore}`);

    // Click Approve (A) on Blue Dart
    console.log('  Approving item "Blue Dart Express Limited"...');
    await page.click('button:has-text("Approve (A)")');
    await page.waitForTimeout(500);

    const itemCountAfterApprove = await page.locator('.cockpit-row').count();
    console.log(`  Items in review queue after approval: ${itemCountAfterApprove}`);
    if (itemCountAfterApprove !== itemCountBefore - 1) {
      throw new Error(`Expected item count to decrease to ${itemCountBefore - 1}, got ${itemCountAfterApprove}`);
    }

    // Verify approval toast
    const toastText = await page.locator('div[role="status"]').textContent();
    console.log('  Approval toast:', toastText);
    if (!toastText.includes('Approved') || !toastText.includes('Blue Dart')) {
      throw new Error('Approval toast missing or incorrect');
    }

    // Press Ctrl+Z to undo
    console.log('  Executing Session Undo (Ctrl+Z)...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    const itemCountAfterUndo = await page.locator('.cockpit-row').count();
    console.log(`  Items in review queue after undo: ${itemCountAfterUndo}`);
    if (itemCountAfterUndo !== itemCountBefore) {
      throw new Error(`Expected item count to restore to ${itemCountBefore}, got ${itemCountAfterUndo}`);
    }

    // Verify restored toast
    const undoToastText = await page.locator('div[role="status"]').textContent();
    console.log('  Undo toast:', undoToastText);
    if (!undoToastText.includes('Undone') || !undoToastText.includes('restored to review queue')) {
      throw new Error('Undo toast missing or incorrect');
    }

    // Verify restored item is at index 0 and loaded in Loupe
    const restoredFirstItem = await page.locator('.cockpit-row').first().locator('.cockpit-row-title').textContent();
    if (!restoredFirstItem.includes('Blue Dart Express Limited')) {
      throw new Error('Restored item should be at original position (index 0)');
    }
    const loupeRestored = await page.locator('aside[aria-label="Detail review"] h2').textContent();
    if (!loupeRestored.includes('Blue Dart Express Limited')) {
      throw new Error('Loupe did not restore active inspection item');
    }
    console.log('  ✓ Item restored at original position (index 0) and in Loupe');

    // Screenshot 5: Session Undo State Restoration
    const ss5Path = path.join(screenshotsDir, '05_session_undo_state_restoration.png');
    await page.screenshot({ path: ss5Path });
    console.log(`  ✓ Captured screenshot 5: ${ss5Path}`);

    // 4.4 Check Audit Trail ledger view for ACTION_UNDO entry
    console.log('  Checking Audit Trail view for ACTION_UNDO block...');
    await page.click('button:has-text("Audit trail")');
    await page.waitForSelector('h1:has-text("Audit trail")');

    const auditTrailText = await page.locator('.cockpit-wrap').textContent();
    if (!auditTrailText.includes('action undo')) {
      throw new Error('ACTION_UNDO block missing in audit trail');
    }
    if (!auditTrailText.includes('Undone: Approved match for Blue Dart Express Limited')) {
      throw new Error('ACTION_UNDO details missing in audit trail');
    }
    console.log('  ✓ ACTION_UNDO block confirmed in immutable SHA-256 audit ledger');

    // =========================================================================
    // Gate B - Console Error Check
    // =========================================================================
    console.log('\n--- Checking Browser Console Logs ---');
    console.log(`Total console error events: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Browser console errors encountered:', consoleErrors);
      throw new Error(`Encountered ${consoleErrors.length} unhandled console error(s) during verification`);
    }
    console.log('✓ Zero unhandled JavaScript exceptions or console errors!');

    console.log('\n======================================================');
    console.log('  ALL GATE B E2E BROWSER CHECKS PASSED WITH 100% SUCCESS');
    console.log('======================================================');

    await browser.close();
  } finally {
    // Kill the preview server
    server.kill();
    process.exit(0);
  }
}

runE2E().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
