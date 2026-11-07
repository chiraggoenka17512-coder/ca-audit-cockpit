import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

async function run() {
  console.log('[E2E] Starting Playwright E2E verification for Flow 6...');

  const screenshotsDir = path.resolve('screenshots/flow6');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    console.log('[E2E] Chrome channel failed, trying msedge...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Listen to console errors and warnings
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Navigate to http://localhost:5176
  console.log('[E2E] 1. Navigating to http://localhost:5176...');
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 2. Click "Exceptions" in sidebar
  console.log('[E2E] 2. Clicking Exceptions in sidebar...');
  const exceptionsNavButton = page.locator('button.cockpit-nav-item', { hasText: 'Exceptions' });
  await exceptionsNavButton.click();
  await page.waitForTimeout(500);

  // Verify Exception Queue header is displayed
  const header = page.locator('h2', { hasText: 'Exception Queue' });
  await header.waitFor({ state: 'visible' });
  console.log('[E2E] Exception Queue header is visible.');

  // Screenshot 1: 01_exceptions_queue.png
  const screenshot1Path = path.join(screenshotsDir, '01_exceptions_queue.png');
  await page.screenshot({ path: screenshot1Path });
  console.log(`[E2E] Saved Screenshot 1: ${screenshot1Path}`);

  // 3. Test J and K keyboard navigation
  console.log('[E2E] 3. Testing J / K keyboard navigation...');
  const initialSelected = page.locator('[role="option"][aria-selected="true"]');
  const initialText = await initialSelected.innerText();
  console.log(`[E2E] Initially selected item: ${initialText.split('\n')[0]}`);

  // Press 'j' to navigate to next item
  await page.keyboard.press('j');
  await page.waitForTimeout(300);
  const secondSelected = page.locator('[role="option"][aria-selected="true"]');
  const secondText = await secondSelected.innerText();
  console.log(`[E2E] After 'j' pressed, selected: ${secondText.split('\n')[0]}`);
  assert.notEqual(initialText, secondText, 'Focus must move to next item upon J press');

  // Verify active focus styling class
  const classAttr = await secondSelected.getAttribute('class');
  assert.ok(
    classAttr.includes('border-emerald-500/50') && classAttr.includes('bg-neutral-900/80'),
    'Focused item must have border-emerald-500/50 and bg-neutral-900/80'
  );

  // Press 'k' to navigate back to previous item
  await page.keyboard.press('k');
  await page.waitForTimeout(300);
  const thirdSelected = page.locator('[role="option"][aria-selected="true"]');
  const thirdText = await thirdSelected.innerText();
  console.log(`[E2E] After 'k' pressed, selected: ${thirdText.split('\n')[0]}`);
  assert.equal(initialText, thirdText, 'Focus must return to original item upon K press');

  // Screenshot 2: 02_item_focused.png
  const screenshot2Path = path.join(screenshotsDir, '02_item_focused.png');
  await page.screenshot({ path: screenshot2Path });
  console.log(`[E2E] Saved Screenshot 2: ${screenshot2Path}`);

  // 4. Test clicking an item to inspect
  console.log('[E2E] 4. Testing item click...');
  const allOptionElements = page.locator('[role="option"]');
  const initialCount = await allOptionElements.count();
  console.log(`[E2E] Total exception rows: ${initialCount}`);
  assert.ok(initialCount >= 4, `Expected at least 4 exception items, found ${initialCount}`);

  // Click on the 2nd item
  const targetItem = allOptionElements.nth(1);
  const targetItemText = await targetItem.innerText();
  console.log(`[E2E] Clicking row 2: ${targetItemText.split('\n')[0]}`);
  await targetItem.click();
  await page.waitForTimeout(300);

  const selectedAfterClick = page.locator('[role="option"][aria-selected="true"]');
  const selectedAfterClickText = await selectedAfterClick.innerText();
  assert.equal(selectedAfterClickText, targetItemText, 'Clicked item must become selected');

  // 5. Test pressing Space or clicking "Batch approve" on a group to trigger Batch Approval Confirmation Dialog
  console.log('[E2E] 5. Triggering Batch Approval Confirmation Dialog...');
  // Click first item again to focus on Timing Difference category
  await allOptionElements.nth(0).click();
  await page.waitForTimeout(300);

  // Press Space to open dialog for focused item's category
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);

  // Verify BatchConfirmDialog opened
  const dialog = page.locator('div[role="dialog"]');
  await dialog.waitFor({ state: 'visible' });
  const dialogTitle = page.locator('#batch-confirm-title');
  const titleText = await dialogTitle.innerText();
  console.log(`[E2E] Dialog opened with title: "${titleText}"`);
  assert.equal(titleText, 'Batch Approval Confirmation');

  // Verify dialog content (voucher count in tabular-nums, total in rupees & integer paise, statutory citation)
  const voucherCountEl = dialog.locator('div.tabular-nums', { hasText: 'voucher' });
  const voucherCountText = await voucherCountEl.innerText();
  console.log(`[E2E] Dialog voucher count: "${voucherCountText}"`);
  assert.ok(voucherCountText.includes('voucher'), 'Dialog must show voucher count');

  const totalPaiseEl = dialog.locator('div.tabular-nums', { hasText: 'paise' }).first();
  const totalPaiseText = await totalPaiseEl.innerText();
  console.log(`[E2E] Dialog aggregate paise: "${totalPaiseText}"`);
  assert.ok(totalPaiseText.includes('paise'), 'Dialog must display total in integer paise');

  const ruleCitationEl = dialog.locator('text=Rule 36(4)');
  await ruleCitationEl.waitFor({ state: 'visible' });
  const citationText = await ruleCitationEl.innerText();
  console.log(`[E2E] Dialog statutory citation: "${citationText}"`);
  assert.ok(citationText.includes('Rule 36(4)'), 'Dialog must display Rule 36(4) statutory citation');

  // Screenshot 3: 03_batch_confirm_dialog.png
  const screenshot3Path = path.join(screenshotsDir, '03_batch_confirm_dialog.png');
  await page.screenshot({ path: screenshot3Path });
  console.log(`[E2E] Saved Screenshot 3: ${screenshot3Path}`);

  // 6. Press Enter or click confirm in dialog to execute batch approval
  console.log('[E2E] 6. Confirming batch approval with Enter...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);

  // Verify dialog is closed
  const dialogClosed = await page.locator('div[role="dialog"]').count();
  assert.equal(dialogClosed, 0, 'Dialog should close after confirmation');

  // Check notification toast
  const toast = page.locator('div[role="status"]');
  if (await toast.count() > 0) {
    const toastText = await toast.innerText();
    console.log(`[E2E] Toast notification after batch approval: "${toastText}"`);
    assert.ok(toastText.includes('Batch approved'), 'Toast should confirm batch approval');
  }

  // Count items after batch approval
  const remainingCount = await page.locator('[role="option"]').count();
  console.log(`[E2E] Remaining items in queue after batch approval: ${remainingCount}`);
  assert.ok(remainingCount < initialCount, 'Batch approved items should be removed from queue');

  // 7. Press U or Ctrl+Z to trigger session undo and verify items are restored
  console.log('[E2E] 7. Pressing U for session undo...');
  await page.keyboard.press('u');
  await page.waitForTimeout(700);

  // Verify toast after undo
  if (await toast.count() > 0) {
    const undoToastText = await toast.innerText();
    console.log(`[E2E] Toast notification after undo: "${undoToastText}"`);
    assert.ok(undoToastText.includes('Undone') || undoToastText.includes('restored'), 'Toast should confirm undo');
  }

  // Verify items are restored
  const restoredCount = await page.locator('[role="option"]').count();
  console.log(`[E2E] Restored items in queue after session undo: ${restoredCount}`);
  assert.equal(restoredCount, initialCount, 'All approved items must be fully restored upon session undo');

  // Screenshot 4: 04_batch_approved_and_undone.png
  const screenshot4Path = path.join(screenshotsDir, '04_batch_approved_and_undone.png');
  await page.screenshot({ path: screenshot4Path });
  console.log(`[E2E] Saved Screenshot 4: ${screenshot4Path}`);

  // Check for any unhandled browser console errors
  console.log(`[E2E] Browser console errors encountered: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.warn('[E2E] Console errors:', consoleErrors);
  }
  assert.equal(consoleErrors.length, 0, 'No console errors should occur during Flow 6 E2E test');

  await browser.close();
  console.log('[E2E] Flow 6 E2E verification completed successfully with 0 errors!');
}

run().catch((err) => {
  console.error('[E2E FAIL]', err);
  process.exit(1);
});
