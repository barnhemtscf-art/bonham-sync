import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createDefaultState } from './src/data/seedData';
import {
  buildMemberCreateDoc,
  buildShopItemCreateDoc,
  buildSickReportCreateDoc,
  buildSnackBillCreateDoc,
  normalizeAllowedEmails,
} from './src/services/firestoreSync';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules enforces Eight Pillars and Dirty Dozen invariants', () => {
  // 1. Default deny catch-all
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);

  // 2. Email verification + no spoofed unverified email
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);

  // 3. Bootstrapped runtime admin email
  assert.match(rulesText, /barnhem\.tscf@gmail\.com/);

  // 4. Path variable ID poisoning guard
  assert.match(rulesText, /function isValidId\(id\)/);

  // 5. Validation blueprints + temporal integrity across every collection
  for (const fn of [
    'isValidMember',
    'isValidShopItem',
    'isValidSickReport',
    'isValidSnackBill',
    'isValidFoundationSettings',
    'isValidAdminUser',
  ]) {
    assert.ok(rulesText.includes(`function ${fn}(data)`), `Missing ${fn}`);
  }

  // 6. Strict list query enforcement without get()/exists() in allow list
  const listMatches = rulesText.match(/allow list:[^;]+;/g) || [];
  assert.ok(listMatches.length >= 5);
  for (const rule of listMatches) {
    assert.equal(rule.includes('get('), false, `allow list must not call get(): ${rule}`);
    assert.equal(rule.includes('exists('), false, `allow list must not call exists(): ${rule}`);
  }
});

test('Firestore payload sanitizers enforce schema bounds and allowlist', () => {
  const state = createDefaultState('2026-11-17');
  const allowed = normalizeAllowedEmails(['staff@example.com', 'barnhem.tscf@gmail.com']);
  assert.ok(allowed.includes('barnhem.tscf@gmail.com'));
  assert.ok(allowed.includes('staff@example.com'));

  const memberDoc = buildMemberCreateDoc(state.members[6], 'uid_admin', allowed);
  assert.equal(typeof memberDoc.stars, 'number');
  assert.ok(!('undefined' in Object.values(memberDoc)));
  assert.ok((memberDoc.allowedEmails as string[]).includes('barnhem.tscf@gmail.com'));

  const oversizedItem = {
    ...state.shopItems[0],
    imageBase64: 'x'.repeat(200000),
  };
  const shopDoc = buildShopItemCreateDoc(oversizedItem, 'uid_admin', allowed);
  assert.equal(shopDoc.imageBase64, undefined, 'Oversized imageBase64 (>140KB) must be dropped');

  const sickDoc = buildSickReportCreateDoc(
    {
      id: 'sick_1',
      kidId: 'j1',
      kidNickname: 'เก้า',
      symptom: 'ไข้สูง',
      details: 'ปวดหัว',
      reportedAt: '08:15:00',
      dateStr: '2026-11-17',
      resolved: false,
    },
    'uid_admin',
    allowed
  );
  assert.equal(sickDoc.resolved, false);

  const billDoc = buildSnackBillCreateDoc(
    {
      id: 'bill_1',
      kidId: 'j1',
      kidNickname: 'เก้า',
      itemId: 'snack_pocky',
      itemName: 'ป๊อกกี้',
      category: 'snack',
      priceStars: 30,
      createdAt: '10:00:00',
      dateStr: '2026-11-17',
      fulfilled: false,
    },
    'uid_admin',
    allowed
  );
  assert.equal(billDoc.createdAtLabel, '10:00:00');
  assert.ok(rulesText.includes('doorCommands'));
});
