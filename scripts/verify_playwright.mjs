import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 4193;
const URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.resolve('screenshots/flow5');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitServerReady(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) {
        console.log(`Preview server ready at ${url}`);
        return true;
      }
    } catch (e) {
      // wait and retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start at ${url} within timeout`);
}

async function run() {
  console.log('--- Starting Flow 5 Playwright Verification ---');

  // 1. Spawn vite preview
  console.log(`Starting preview server on port ${PORT}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe'
  });

  server.stdout.on('data', data => {
    // console.log(`[Vite stdout]: ${data}`);
  });
  server.stderr.on('data', data => {
    // console.log(`[Vite stderr]: ${data}`);
  });

  try {
    await waitServerReady(URL);

    // 2. Launch Chrome via Playwright with channel: 'chrome', headless: true
    console.log("Launching Chromium with { channel: 'chrome', headless: true }...");
    const browser = await chromium.launch({
      channel: 'chrome',
      headless: true
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 950 }
    });

    const page = await context.newPage();

    const consoleLogs = [];
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error(`[PAGE CONSOLE ERROR]: ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
      console.error(`[UNCAUGHT PAGE ERROR]: ${err}`);
    });

    // 3. Open App
    console.log(`Navigating to ${URL}...`);
    await page.goto(URL, { waitUntil: 'networkidle' });

    // 4. Navigate to Reconciliation Tab
    console.log('Navigating to Reconciliation tab in sidebar...');
    const reconNavBtn = page.locator('aside.cockpit-aside button.cockpit-nav-item:has-text("Reconciliation")');
    await reconNavBtn.waitFor({ state: 'visible', timeout: 5000 });
    await reconNavBtn.click();
    await page.waitForTimeout(500);

    // Verify Title & Subtitle
    const h1 = page.locator('h1.cockpit-h1');
    await h1.waitFor({ state: 'visible', timeout: 5000 });
    const h1Text = await h1.innerText();
    console.log(`Loaded View Title: "${h1Text}"`);

    const subtitle = await page.locator('p.cockpit-sub').innerText();
    console.log(`Subtitle: "${subtitle}"`);

    // Verify 4 Summary Cards
    const summaryCards = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div');
    const cardCount = await summaryCards.count();
    console.log(`Summary cards count: ${cardCount}`);

    for (let i = 0; i < cardCount; i++) {
      const card = summaryCards.nth(i);
      const title = await card.locator('.text-xs.text-\\[\\#8a909c\\]').first().innerText();
      const val = await card.locator('.text-xl.font-semibold').innerText();
      const sub = await card.locator('.text-xs.text-\\[\\#8a909c\\]').last().innerText();
      console.log(`  Card ${i + 1}: ${title} -> ${val} (${sub})`);
    }

    // Capture Screenshot 1: 01_reconciliation_summary_and_overview.png
    const ss1Path = path.join(SCREENSHOT_DIR, '01_reconciliation_summary_and_overview.png');
    await page.screenshot({ path: ss1Path, fullPage: true });
    console.log(`Screenshot 1 saved: ${ss1Path}`);

    // 5. Expand collapsible green reconciled row
    console.log('Testing collapsible green reconciled row...');
    const collapsedGreenRow = page.locator('.bg-emerald-950\\/20').first();
    await collapsedGreenRow.waitFor({ state: 'visible', timeout: 5000 });
    const greenRowText = await collapsedGreenRow.innerText();
    console.log(`Clicking green row: "${greenRowText.split('\n')[0]}"`);
    await collapsedGreenRow.click();
    await page.waitForTimeout(500);

    // Verify side-by-side details are visible inside expanded container
    const expandedArea = page.locator('.bg-\\[\\#171a21\\].border-t.border-\\[\\#262a33\\]').first();
    await expandedArea.waitFor({ state: 'visible', timeout: 5000 });
    const sourceAText = await expandedArea.locator('text=Source A: Books Record').first().isVisible();
    const sourceBText = await expandedArea.locator('text=Source B: Portal Record').first().isVisible();
    console.log(`Source A Books visible in expansion: ${sourceAText}`);
    console.log(`Source B Portal visible in expansion: ${sourceBText}`);

    // Capture Screenshot 2: 02_expanded_reconciled_pair.png
    const ss2Path = path.join(SCREENSHOT_DIR, '02_expanded_reconciled_pair.png');
    await page.screenshot({ path: ss2Path, fullPage: true });
    console.log(`Screenshot 2 saved: ${ss2Path}`);

    // Click again to collapse and verify it collapses
    console.log('Clicking green row again to collapse...');
    await collapsedGreenRow.click();
    await page.waitForTimeout(400);
    const isExpandedStillVisible = await expandedArea.isVisible();
    console.log(`Expanded proof collapsed cleanly: ${!isExpandedStillVisible}`);

    // 6. Test Filter bar: "Suggestions" button
    console.log('Clicking "Suggestions" filter button...');
    const suggestionsBtn = page.locator('button:has-text("Suggestions (")');
    await suggestionsBtn.click();
    await page.waitForTimeout(400);

    // Verify suggestions section is displayed
    const suggestionCards = page.locator('.bg-amber-950\\/20');
    const initialSugCount = await suggestionCards.count();
    console.log(`Visible Amber Suggestion Cards count: ${initialSugCount}`);

    // Capture Screenshot 3: 03_amber_confidence_suggestions.png
    const ss3Path = path.join(SCREENSHOT_DIR, '03_amber_confidence_suggestions.png');
    await page.screenshot({ path: ss3Path, fullPage: true });
    console.log(`Screenshot 3 saved: ${ss3Path}`);

    // 7. Interactive Button Test: "Approve Match" on first suggestion card
    console.log('Clicking "Approve Match" on first suggestion card...');
    const firstApproveBtn = page.locator('button:has-text("Approve Match")').first();
    await firstApproveBtn.click();
    await page.waitForTimeout(500);

    const postApproveSugCount = await page.locator('.bg-amber-950\\/20').count();
    console.log(`Suggestion cards after Approve Match: ${postApproveSugCount} (decreased from ${initialSugCount})`);

    // 8. Interactive Button Test: "Reject" on another suggestion card
    console.log('Clicking "Reject" on remaining suggestion card...');
    const firstRejectBtn = page.locator('button:has-text("Reject")').first();
    await firstRejectBtn.click();
    await page.waitForTimeout(500);

    const postRejectSugCount = await page.locator('.bg-amber-950\\/20').count();
    console.log(`Suggestion cards after Reject: ${postRejectSugCount} (all handled)`);

    // 9. Test Filter bar: "Exceptions" button
    console.log('Clicking "Exceptions" filter button in filter bar...');
    const exceptionsBtn = page.locator('button:has-text("Exceptions (")');
    await exceptionsBtn.click();
    await page.waitForTimeout(400);

    // Verify grouped root causes
    const missing2bHeader = await page.locator('text=Missing in GSTR-2B (ITC At Risk)').isVisible();
    const rateMismatchHeader = await page.locator('text=Tax Rate / Amount Discrepancy').isVisible();
    const missingBooksHeader = await page.locator('text=Unclaimed in Books').isVisible();

    console.log(`Exception Group 1 (Missing in GSTR-2B Sec 16(2)(aa)) visible: ${missing2bHeader}`);
    console.log(`Exception Group 2 (Tax Rate / Amount Discrepancy Sec 16(2)(c)) visible: ${rateMismatchHeader}`);
    console.log(`Exception Group 3 (Unclaimed in Books) visible: ${missingBooksHeader}`);

    // Capture Screenshot 4: 04_unmatched_exceptions_grouped.png
    const ss4Path = path.join(SCREENSHOT_DIR, '04_unmatched_exceptions_grouped.png');
    await page.screenshot({ path: ss4Path, fullPage: true });
    console.log(`Screenshot 4 saved: ${ss4Path}`);

    // 10. Test Filter bar: "Matched" and "All" buttons
    console.log('Testing "Matched" filter button in filter bar...');
    await page.locator('button:has-text("Matched (")').click();
    await page.waitForTimeout(400);
    const matchedCount = await page.locator('.bg-emerald-950\\/20').count();
    console.log(`Matched pairs visible under "Matched" filter: ${matchedCount}`);

    console.log('Testing "All" filter button in filter bar...');
    await page.locator('button:has-text("All (")').click();
    await page.waitForTimeout(400);

    // 11. Test Dual Source dropdowns
    console.log('Testing Dual Source Selectors...');
    const sourceASelect = page.locator('select').first();
    const sourceBSelect = page.locator('select').nth(1);

    await sourceASelect.selectOption('General Ledger (Books)');
    await sourceBSelect.selectOption('Bank Statement (CSV)');
    await page.waitForTimeout(400);

    const headerA = await page.locator('text=SOURCE A: General Ledger (Books)').isVisible();
    const headerB = await page.locator('text=SOURCE B: Bank Statement (CSV)').isVisible();
    console.log(`Source A updated to General Ledger: ${headerA}`);
    console.log(`Source B updated to Bank Statement: ${headerB}`);

    // 12. Check console errors and uncaught page exceptions
    console.log('\n--- Console & Error Audit ---');
    console.log(`Console errors count: ${consoleErrors.length}`);
    console.log(`Uncaught page errors count: ${pageErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.error('Page errors:', pageErrors);
    }

    await browser.close();

    const passed = consoleErrors.length === 0 && pageErrors.length === 0 &&
      cardCount === 4 && sourceAText && sourceBText && !isExpandedStillVisible &&
      postApproveSugCount === 1 && postRejectSugCount === 0 &&
      missing2bHeader && rateMismatchHeader && missingBooksHeader;

    console.log(`\nVerification Result: ${passed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
    return { passed, consoleErrors, pageErrors };
  } finally {
    console.log('Shutting down preview server...');
    server.kill();
    // On Windows, child_process.spawn with shell: true may leave node child running
    spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' });
  }
}

run().then(res => {
  if (!res.passed) {
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
