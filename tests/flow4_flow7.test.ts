import assert from 'node:assert/strict';
import test from 'node:test';
import { STATUTORY_RULES, getStatutoryRule } from '../src/data/rules.ts';
import { INITIAL_REVIEW_ITEMS } from '../src/data/reviewItems.ts';
import type { ReviewItem } from '../src/data/reviewItems.ts';
import fs from 'node:fs';
import path from 'node:path';

test('Flow 7: Statutory rules registry integrity', () => {
  // Test 1: Verified rules have required statutory properties
  const sec16 = getStatutoryRule('SEC-16-2-AA');
  assert.ok(sec16, 'SEC-16-2-AA should exist in registry');
  assert.equal(sec16.verified, true);
  assert.ok(sec16.legalText.includes('Section 37') || sec16.legalText.includes('section 37'));
  assert.ok(sec16.effectiveFrom.length > 0);
  assert.ok(sec16.effectiveTo.length > 0);
  assert.ok(sec16.sourceAuthority.length > 0);

  const sec93 = getStatutoryRule('SEC-9-3');
  assert.ok(sec93, 'SEC-9-3 should exist in registry');
  assert.equal(sec93.verified, true);
  assert.ok(sec93.legalText.includes('reverse charge'));

  const sec194j = getStatutoryRule('SEC-194J');
  assert.ok(sec194j, 'SEC-194J should exist in registry');
  assert.equal(sec194j.verified, true);

  // Test 2: Unverified rule indicator
  const unverified = getStatutoryRule('CIRCULAR-UNVERIFIED-CESS');
  assert.ok(unverified, 'CIRCULAR-UNVERIFIED-CESS should exist');
  assert.equal(unverified.verified, false, 'Unverified rule must have verified=false');
  assert.ok(unverified.guidanceNote.includes('UNVERIFIED RULE'));

  // Test 3: Fallback for missing or invalid rule
  assert.equal(getStatutoryRule(undefined), null);
  assert.equal(getStatutoryRule('NON_EXISTENT_RULE'), null);
});

test('Flow 4: Extracted fields and coordinate bounding boxes in review items', () => {
  assert.ok(INITIAL_REVIEW_ITEMS.length >= 8, 'At least 8 test review items should exist');

  // Check item 1 (Blue Dart)
  const item1 = INITIAL_REVIEW_ITEMS[0];
  assert.equal(item1.id, 'rev-001');
  assert.ok(item1.extractedFields && item1.extractedFields.length > 0, 'Extracted fields must exist');
  
  // Verify bounding box coordinates [x, y, w, h] format
  for (const field of item1.extractedFields!) {
    assert.equal(field.box.length, 4, 'Bounding box must have 4 coordinates [x, y, w, h]');
    assert.ok(field.box.every(n => typeof n === 'number' && n >= 0), 'Coordinates must be non-negative numbers');
    assert.ok(field.confidence >= 0 && field.confidence <= 1.0, 'Confidence must be between 0 and 1');
  }

  // Check item 2: Low confidence field (< 0.85) triggers amber check
  const item2 = INITIAL_REVIEW_ITEMS[1];
  assert.ok(item2.confidenceScore < 0.85, 'Item 2 should have confidence < 0.85');
  assert.ok(item2.extractedFields?.some(f => f.confidence < 0.85), 'Item 2 must have at least one field < 0.85');

  // Check item 7: Unverified rule
  const item7 = INITIAL_REVIEW_ITEMS.find(i => i.id === 'rev-007');
  assert.ok(item7, 'Item 7 must exist');
  assert.equal(item7.ruleVerified, false, 'Item 7 must have ruleVerified: false');

  // Check item 8: No rule cited
  const item8 = INITIAL_REVIEW_ITEMS.find(i => i.id === 'rev-008');
  assert.ok(item8, 'Item 8 must exist');
  assert.equal(item8.ruleId, undefined, 'Item 8 must have no ruleId');
  assert.equal(item8.ruleName, undefined, 'Item 8 must have no ruleName');
});

test('Flow 7: Plain language agreements & differences', () => {
  for (const item of INITIAL_REVIEW_ITEMS) {
    assert.ok(item.why && item.why.length > 20, `Item ${item.id} must have a descriptive why statement`);
    if (item.agreedFields) {
      assert.ok(item.agreedFields.length > 0, `Item ${item.id} agreed fields must not be empty if defined`);
    }
    if (item.differingFields) {
      assert.ok(item.differingFields.length > 0, `Item ${item.id} differing fields must not be empty if defined`);
    }
  }
});

test('Zero AI Design Slop: DetailPanel.tsx static code audit', () => {
  const panelPath = path.resolve('src/components/DetailPanel.tsx');
  const code = fs.readFileSync(panelPath, 'utf-8');

  // Rule 1: No rounded-full chip bubbles/tags in DetailPanel
  assert.ok(!code.includes('rounded-full'), 'DetailPanel must not contain rounded-full pills or tags');

  // Rule 2: No decorative italics
  assert.ok(!code.includes('italic'), 'DetailPanel must not contain decorative italics');

  // Rule 4: No negative tracking
  assert.ok(!code.includes('tracking-tight'), 'DetailPanel must not contain tracking-tight');
  assert.ok(!code.includes('tracking-[-'), 'DetailPanel must not contain negative kerning');

  // Rule 11: No pseudo-code headers
  assert.ok(!code.includes('// INSPECTION LOUPE //'), 'No pseudo-code comments as headers');

  // Rule 17: Numbers must use tabular-nums, not font-mono
  // Check that ocrValue is not styled with font-mono
  assert.ok(!code.includes('font-mono text-sm'), 'Numbers must not be styled with font-mono');

  // Keyboard accessibility: Escape handling & single action approve
  assert.ok(code.includes("e.key === 'Escape'"), 'DetailPanel must handle Escape');
  assert.ok(code.includes("onApprove(item)"), 'DetailPanel must provide single-action onApprove');
  assert.ok(code.includes("stopPropagation"), 'Modal Escape must stop propagation to preserve DetailPanel state');
});
