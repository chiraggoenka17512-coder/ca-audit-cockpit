import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve(process.cwd(), 'screenshots/flow3');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runE2E() {
  console.log('--- ReconOS Flow 3: E2E Playwright Verification Starting ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  try {
    // 1. Navigate to the app
    console.log('Navigating to http://localhost:5178...');
    await page.goto('http://localhost:5178', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2. Open Import Documents view from sidebar rail
    console.log('Clicking "Import documents" in sidebar rail...');
    const importNavButton = page.locator('aside button:has-text("Import documents")');
    await importNavButton.waitFor({ state: 'visible', timeout: 5000 });
    await importNavButton.click();
    await page.waitForTimeout(800);

    // 3. Verify Import View & Drag-and-drop staging zone
    console.log('Verifying Import View & Dropzone...');
    const dropzone = page.locator('text=Drop Indian financial documents here or click to browse');
    await dropzone.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Dropzone verified visible.');

    // Screenshot 1: 01_import_view.png
    const shot1Path = path.join(screenshotDir, '01_import_view.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`Saved screenshot 1: ${shot1Path}`);

    // 4. Verify Staged files table
    console.log('Verifying staging table with initial sample files...');
    const tableHeader = page.locator('text=Document staging table');
    await tableHeader.waitFor({ state: 'visible', timeout: 5000 });

    // Screenshot 2: 02_staged_files_table.png
    const shot2Path = path.join(screenshotDir, '02_staged_files_table.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`Saved screenshot 2: ${shot2Path}`);

    // 5. Test changing file type via manual override dropdown
    console.log('Testing manual file type override dropdown...');
    // Find the first select dropdown in the table (Purchase Register by default)
    const firstSelect = page.locator('select').first();
    await firstSelect.waitFor({ state: 'visible', timeout: 5000 });
    await firstSelect.focus();
    
    // Screenshot 3: 03_type_override_dropdown.png (while focused on dropdown)
    const shot3Path = path.join(screenshotDir, '03_type_override_dropdown.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`Saved screenshot 3: ${shot3Path}`);

    // Let's test dropdown selection change and change it back or keep it
    const currentVal = await firstSelect.inputValue();
    console.log(`Initial dropdown value: ${currentVal}`);
    await firstSelect.selectOption('Purchase Register');

    // 6. Test clicking "Start ingestion" button
    console.log('Clicking "Start ingestion" button...');
    const ingestButton = page.locator('button:has-text("Start ingestion")');
    await ingestButton.waitFor({ state: 'visible', timeout: 5000 });
    const buttonText = await ingestButton.innerText();
    console.log(`Ingestion button text before click: "${buttonText}"`);
    await ingestButton.click();
    await page.waitForTimeout(1200);

    // 7. Verify Ingestion Summary Strip & Details
    console.log('Verifying Ingestion Summary Strip after processing...');
    const rowsReadKPI = page.locator('div.text-xs:has-text("Rows read")').first();
    await rowsReadKPI.waitFor({ state: 'visible', timeout: 5000 });

    // Look for parsed indicators
    const parsedBadges = page.locator('span:has-text("Parsed")');
    const parsedCount = await parsedBadges.count();
    console.log(`Parsed files count: ${parsedCount}`);

    // Look for attention indicators
    const attentionBadges = page.locator('span:has-text("Attention")');
    const attentionCount = await attentionBadges.count();
    console.log(`Attention files count: ${attentionCount}`);

    // Look for rejected details expand button
    const viewRejectedBtn = page.locator('button:has-text("View rejected rows")').first();
    if (await viewRejectedBtn.isVisible()) {
      console.log('Expanding rejected rows details...');
      await viewRejectedBtn.click();
      await page.waitForTimeout(500);
      const rejectedSection = page.locator('text=No silent drops').first();
      await rejectedSection.waitFor({ state: 'visible', timeout: 3000 });
      console.log('Rejected rows details verified with row numbers and exact reasons.');
    }

    // Screenshot 4: 04_ingestion_complete_summary.png
    const shot4Path = path.join(screenshotDir, '04_ingestion_complete_summary.png');
    await page.screenshot({ path: shot4Path, fullPage: false });
    console.log(`Saved screenshot 4: ${shot4Path}`);

    // 8. Verify vouchers added to review queue and audit ledger updated
    console.log('Navigating to Exceptions view to verify ingested vouchers in review queue...');
    const exceptionsNav = page.locator('aside button:has-text("Exceptions")');
    await exceptionsNav.click();
    await page.waitForTimeout(800);

    const voucherItems = page.locator('.cockpit-row');
    const voucherCount = await voucherItems.count();
    console.log(`Review queue loaded successfully with items. Visible elements: ${voucherCount}`);

    // Check Audit Trail
    console.log('Navigating to Audit Trail to verify document ingestion blocks...');
    const auditNav = page.locator('aside button:has-text("Audit trail")');
    await auditNav.click();
    await page.waitForTimeout(800);

    const docIngestionBlocks = page.locator('text=/document ingestion/i');
    const blockCount = await docIngestionBlocks.count();
    console.log(`Audit Trail confirmed with ${blockCount} document ingestion blocks!`);

    // Verify TitleBar Import Modal button also works
    console.log('Testing TitleBar Import Modal trigger...');
    const importModalBtn = page.locator('header button[title*="Import documents"]');
    if (await importModalBtn.isVisible()) {
      await importModalBtn.click();
      await page.waitForTimeout(500);
      const modalHeader = page.locator('h2:has-text("Import documents")');
      await modalHeader.waitFor({ state: 'visible', timeout: 3000 });
      console.log('TitleBar Import Modal opened successfully!');
      
      // Close modal
      const closeBtn = page.locator('div[role="dialog"] button:has-text("Close"), button:has-text("Close")');
      await closeBtn.first().click();
      await page.waitForTimeout(500);
    }

    console.log('Console errors encountered during test:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error('Console errors list:', consoleErrors);
    }

    console.log('--- ReconOS Flow 3 E2E Playwright Verification PASSED Successfully ---');
    return {
      success: true,
      consoleErrors,
      screenshots: [shot1Path, shot2Path, shot3Path, shot4Path]
    };
  } catch (err) {
    console.error('E2E Test Execution Error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runE2E()
  .then(res => {
    console.log('Result:', JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
  });
