import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, COVER_LOCATIONS } from '../data/seedData';
import {
  buildWeeklyMonthlySummary,
  canUnlockNextLocation,
  evaluateGroup1Breakfast,
  evaluateGroup1ExtraStudy,
  evaluateGroup1Housework,
  evaluateGroup1Van,
  evaluateGroup2Morning,
  evaluateGroup2PhoneReturn,
  evaluateGroup3Evening,
  evaluateGroup3Morning,
  evaluateGroup3NightReturn,
  getGroup1DailyBossSubject,
  getLaundryQueue,
  getMemberDailySafe,
  purchaseShopItem,
  buildMemberQrPayload,
  resolveUnifiedLogin,
} from './rules';
import {
  applyQuickCheckin,
  getQuickCheckinActionsForKid,
  hasAnyDailyCommandDone,
  resetKidDailyCommands,
} from './quickCheckin';
import {
  depositToPiggyBank,
  getSafePiggyBank,
  getTodayPiggyBankDepositTotal,
  togglePiggyBankHidden,
  updatePiggyBankGoal,
  withdrawFromPiggyBank,
} from './piggyBank';
import {
  createDefaultDoorCommands,
  executeDoorCommand,
  formatPenaltyRuleLabel,
  getDoorCommandAvailability,
  isDoorCommandExpired,
} from './doorCommands';
import {
  clearKidPenalties,
  clearKidStars,
  getStaffRemainingDailyStars,
  getStaffStarsGivenToday,
  grantStarsByStaff,
} from './staffStars';

test('seed data contains exact 21 initial members across managers, staff, and 3 kid groups', () => {
  const state = createDefaultState('2026-11-17');
  assert.equal(state.members.length, 21);
  assert.equal(state.members.filter((m) => m.role === 'manager').length, 2);
  assert.equal(state.members.filter((m) => m.role === 'staff').length, 4);
  const kids = state.members.filter((m) => m.role === 'kid');
  assert.equal(kids.length, 15);
  assert.equal(kids.filter((k) => k.ageGroup === 1).length, 5);
  assert.equal(kids.filter((k) => k.ageGroup === 2).length, 8);
  assert.equal(kids.filter((k) => k.ageGroup === 3).length, 2);
  assert.equal(COVER_LOCATIONS.length, 7);

  const s7 = kids.find((k) => k.id === 's7');
  const s10 = kids.find((k) => k.id === 's10');
  assert.equal(s7?.nickname, 'ฟ้า');
  assert.equal(s7?.emoji, '🌤️');
  assert.equal(s10?.nickname, 'ฟา');
  assert.equal(s10?.emoji, '🦋');
});

test('laundry queue computes even (boys), odd (girls), and day 31 (everyone)', () => {
  assert.equal(getLaundryQueue(new Date(2026, 10, 16)).target, 'boys');
  assert.equal(getLaundryQueue(new Date(2026, 10, 17)).target, 'girls');
  assert.equal(getLaundryQueue(new Date(2026, 11, 31)).target, 'everyone');
});

test('Group 1 breakfast, van, extra study, housework, and daily boss language', () => {
  // Breakfast < 06:40 => +5, >= 06:40 => 0
  assert.equal(evaluateGroup1Breakfast(new Date(2026, 10, 17, 6, 39)).starsAwarded, 5);
  assert.equal(evaluateGroup1Breakfast(new Date(2026, 10, 17, 6, 40)).starsAwarded, 0);

  // Van <= 07:01 => +10, >= 07:02 => 0
  assert.equal(evaluateGroup1Van(new Date(2026, 10, 17, 7, 1)).starsAwarded, 10);
  assert.equal(evaluateGroup1Van(new Date(2026, 10, 17, 7, 2)).starsAwarded, 0);

  // Extra study <= 16:50 => +10
  assert.equal(evaluateGroup1ExtraStudy(new Date(2026, 10, 17, 16, 50)).starsAwarded, 10);
  assert.equal(evaluateGroup1ExtraStudy(new Date(2026, 10, 17, 16, 51)).starsAwarded, 0);

  // Housework < 18:15 (+10), 18:15..18:50 (+3), > 18:50 (0)
  assert.equal(evaluateGroup1Housework(new Date(2026, 10, 17, 18, 14)).starsAwarded, 10);
  assert.equal(evaluateGroup1Housework(new Date(2026, 10, 17, 18, 15)).starsAwarded, 3);
  assert.equal(evaluateGroup1Housework(new Date(2026, 10, 17, 18, 50)).starsAwarded, 3);
  assert.equal(evaluateGroup1Housework(new Date(2026, 10, 17, 18, 51)).starsAwarded, 0);

  // Mon=Japanese, Tue=English, Wed=Chinese, Thu=English
  assert.match(getGroup1DailyBossSubject(new Date(2026, 10, 16)).th, /ญี่ปุ่น/);
  assert.match(getGroup1DailyBossSubject(new Date(2026, 10, 17)).th, /อังกฤษ/);
  assert.match(getGroup1DailyBossSubject(new Date(2026, 10, 18)).th, /จีน/);
  assert.match(getGroup1DailyBossSubject(new Date(2026, 10, 19)).th, /อังกฤษ/);
});

test('Group 2 weekday late fine 5 THB/min capped at 50 THB and waived when sick', () => {
  // Tuesday Nov 17, 2026
  const onTime = evaluateGroup2Morning(new Date(2026, 10, 17, 7, 21), false);
  assert.equal(onTime.starsAwarded, 10);
  assert.equal(onTime.fineThb, 0);

  // 07:25 => 4 mins late => 20 THB
  const late4 = evaluateGroup2Morning(new Date(2026, 10, 17, 7, 25), false);
  assert.equal(late4.starsAwarded, 0);
  assert.equal(late4.fineThb, 20);

  // 07:45 => 24 mins late => capped at 50 THB
  const late24 = evaluateGroup2Morning(new Date(2026, 10, 17, 7, 45), false);
  assert.equal(late24.fineThb, 50);

  // Sick today => 0 THB waived
  const sick = evaluateGroup2Morning(new Date(2026, 10, 17, 7, 45), true);
  assert.equal(sick.fineThb, 0);
  assert.equal(sick.isLate, false);
});

test('Group 2 weekend rules and night phone return penalties', () => {
  // Saturday Nov 21, 2026
  assert.equal(evaluateGroup2Morning(new Date(2026, 10, 21, 8, 15), false).starsAwarded, 10);
  assert.equal(evaluateGroup2Morning(new Date(2026, 10, 21, 8, 40), false).isLate, true);
  assert.ok(evaluateGroup2Morning(new Date(2026, 10, 21, 8, 50), false).phoneBlockedReason);

  // Sunday Nov 22, 2026
  assert.equal(evaluateGroup2Morning(new Date(2026, 10, 22, 8, 10), false).starsAwarded, 15);
  assert.ok(evaluateGroup2Morning(new Date(2026, 10, 22, 8, 25), false).phoneBlockedReason);

  // Return without homework > 21:00 => deduct Friday Free Day
  const retNoHwLate = evaluateGroup2PhoneReturn(new Date(2026, 10, 17, 21, 5), false);
  assert.equal(retNoHwLate.freeDayPenaltyDelta, 1);

  // Return with homework <= 22:45 on Tuesday => OK +5 stars
  const retHwOk = evaluateGroup2PhoneReturn(new Date(2026, 10, 17, 22, 40), true);
  assert.equal(retHwOk.starsAwarded, 5);
  assert.equal(retHwOk.isLate, false);

  // Return on Sunday even if homework flag passed => 21:00 deadline (no extension on Sunday)
  const retSunLate = evaluateGroup2PhoneReturn(new Date(2026, 10, 22, 21, 10), true);
  assert.equal(retSunLate.isLate, true);
});

test('Group 3 college/internship rules and 22:45 curfew', () => {
  assert.equal(evaluateGroup3Morning().starsAwarded, 10);
  assert.equal(evaluateGroup3Evening().starsAwarded, 20);
  assert.equal(evaluateGroup3NightReturn(new Date(2026, 10, 17, 22, 45)).isLate, false);
  const lateCurfew = evaluateGroup3NightReturn(new Date(2026, 10, 17, 22, 46));
  assert.equal(lateCurfew.isLate, true);
  assert.ok(lateCurfew.phoneBlockedReason);
});

test('Shop purchase and 7-item location unlock progression', () => {
  const state = createDefaultState('2026-11-17');
  const kao = state.members.find((m) => m.id === 'j1')!;
  kao.stars = 700;

  // Cannot unlock Location 1 yet because Location 0 needs all 7 items
  assert.equal(canUnlockNextLocation(kao, 1).allowed, false);

  let current = kao;
  for (let i = 1; i <= 7; i++) {
    const item = state.shopItems.find((s) => s.id === `loc0_${i}`)!;
    const res = purchaseShopItem(current, item, new Date(2026, 10, 17, 10, 0));
    assert.equal(res.ok, true);
    current = res.updatedMember;
  }

  // Now all 7 location items for stage 0 are collected and stars >= 500
  assert.equal(canUnlockNextLocation(current, 1).allowed, true);
});

test('unified login resolves creator/manager/staff PIN & QR and blocks all kid logins (PIN/ID/QR)', () => {
  const state = createDefaultState('2026-11-17');
  const creatorPins = state.settings.creatorPins;

  assert.equal(resolveUnifiedLogin('9292', state.members, creatorPins).type, 'creator');
  assert.equal(resolveUnifiedLogin('BARNHEM:creator:6417', state.members, creatorPins).type, 'creator');

  const susan = resolveUnifiedLogin('9015', state.members, creatorPins);
  assert.equal(susan.type, 'manager');
  if (susan.type === 'manager') assert.equal(susan.member.id, 'mgr_susan');

  const ek = resolveUnifiedLogin('9794', state.members, creatorPins);
  assert.equal(ek.type, 'staff');
  if (ek.type === 'staff') assert.equal(ek.member.id, 'staff_ek');

  const ekMember = state.members.find((m) => m.id === 'staff_ek')!;
  const ekQr = resolveUnifiedLogin(buildMemberQrPayload(ekMember), state.members, creatorPins);
  assert.equal(ekQr.type, 'staff');

  const kaoById = resolveUnifiedLogin('j1', state.members, creatorPins);
  assert.equal(kaoById.type, 'kid_blocked');

  const kaoMember = state.members.find((m) => m.id === 'j1')!;
  const qrPayload = buildMemberQrPayload(kaoMember);
  assert.equal(qrPayload, 'BARNHEM:j1:9346');
  const kaoByQr = resolveUnifiedLogin(qrPayload, state.members, creatorPins);
  assert.equal(kaoByQr.type, 'kid_blocked');

  assert.equal(resolveUnifiedLogin('0000', state.members, creatorPins).type, 'not_found');
});


test('staff express quick check-in handles Group 1/2/3 rules and prevents duplicate stars', () => {
  const state = createDefaultState('2026-11-18');
  const kao = state.members.find((m) => m.id === 'j1')!;
  const initialStars = kao.stars;

  const g1Actions = getQuickCheckinActionsForKid(kao, '2026-11-18');
  assert.equal(g1Actions.length, 6);

  // Express breakfast at 06:30 => +5 stars and breakfastDone=true
  const res1 = applyQuickCheckin(kao, 'g1_breakfast', new Date(2026, 10, 18, 6, 30), 'พี่เอก');
  assert.equal(res1.alreadyDone, false);
  assert.equal(res1.updatedMember.stars, initialStars + 5);
  assert.equal(res1.updatedMember.dailyProgress.breakfastDone, true);

  // Repeating same action same day does NOT award duplicate stars
  const resDup = applyQuickCheckin(
    res1.updatedMember,
    'g1_breakfast',
    new Date(2026, 10, 18, 6, 32),
    'พี่เอก'
  );
  assert.equal(resDup.alreadyDone, true);
  assert.equal(resDup.updatedMember.stars, initialStars + 5);

  // Group 2 late morning check-in at 07:25 calculates 20 THB fine
  const bank = state.members.find((m) => m.id === 's4')!;
  const resG2 = applyQuickCheckin(bank, 'g2_morning', new Date(2026, 10, 18, 7, 25), 'พี่เอก');
  assert.equal(resG2.alreadyDone, false);
  assert.equal(resG2.updatedMember.lateFineThb, 20);
  assert.equal(resG2.updatedMember.dailyProgress.morningPhoneCheckedOut, true);
});

test('resetKidDailyCommands clears daily action buttons while preserving stars and sick status', () => {
  const state = createDefaultState('2026-11-18');
  const kao = state.members.find((m) => m.id === 'j1')!;
  assert.equal(hasAnyDailyCommandDone(kao, '2026-11-18'), false);

  const afterBoss = applyQuickCheckin(kao, 'g1_boss', new Date(2026, 10, 18, 20, 5), 'พี่เอก').updatedMember;
  const sickAndDone = {
    ...afterBoss,
    dailyProgress: { ...afterBoss.dailyProgress, isSickToday: true, homeCheckInDone: true },
  };
  assert.equal(hasAnyDailyCommandDone(sickAndDone, '2026-11-18'), true);

  const reset = resetKidDailyCommands(sickAndDone, '2026-11-18');
  assert.equal(hasAnyDailyCommandDone(reset, '2026-11-18'), false);
  assert.equal(reset.cartoonUnlockedToday, false);
  assert.equal(reset.dailyProgress.bossStageDone, undefined);
  assert.equal(reset.dailyProgress.homeCheckInDone, undefined);
  assert.equal(reset.dailyProgress.isSickToday, true);
  assert.equal(reset.stars, sickAndDone.stars);
});

test('holiday mode waives Group 1 and Group 2 school morning tardiness and fines', () => {
  const lateBreakfast = evaluateGroup1Breakfast(new Date(2026, 10, 18, 8, 30), true);
  assert.equal(lateBreakfast.isLate, false);
  assert.equal(lateBreakfast.starsAwarded, 5);

  const lateVan = evaluateGroup1Van(new Date(2026, 10, 18, 8, 30), true);
  assert.equal(lateVan.isLate, false);
  assert.equal(lateVan.starsAwarded, 10);

  const lateG2 = evaluateGroup2Morning(new Date(2026, 10, 18, 8, 45), false, true);
  assert.equal(lateG2.isLate, false);
  assert.equal(lateG2.fineThb, 0);
  assert.equal(lateG2.starsAwarded, 10);
});

test('getMemberDailySafe keeps 1-day phone block on target date and auto-clears next day', () => {
  const state = createDefaultState('2026-11-18');
  const bank = state.members.find((m) => m.id === 's4')!;

  const curfewEval = evaluateGroup2PhoneReturn(new Date(2026, 10, 18, 22, 50), true);
  assert.equal(curfewEval.phoneBlockedUntilDate, '2026-11-19');

  const blockedKid = {
    ...bank,
    phoneBlockedReason: curfewEval.phoneBlockedReason,
    dailyProgress: {
      ...bank.dailyProgress,
      dateStr: '2026-11-18',
      phoneBlockedUntilDate: curfewEval.phoneBlockedUntilDate,
    },
    penalties: [
      {
        id: 'p_test',
        dateStr: '2026-11-18',
        reason: curfewEval.phoneBlockedReason!,
        fineThb: 0,
        resolved: false,
      },
    ],
  };

  // Next day (2026-11-19): penalty is active today
  const onBlockedDay = getMemberDailySafe(blockedKid, '2026-11-19');
  assert.equal(onBlockedDay.phoneBlockedReason, curfewEval.phoneBlockedReason);
  assert.equal(onBlockedDay.dailyProgress.phoneBlockedUntilDate, '2026-11-19');

  // Day after expiry (2026-11-20): auto-cleared!
  const afterExpiry = getMemberDailySafe(onBlockedDay, '2026-11-20');
  assert.equal(afterExpiry.phoneBlockedReason, undefined);
  assert.equal(afterExpiry.dailyProgress.phoneBlockedUntilDate, undefined);
  assert.equal(afterExpiry.penalties[0].resolved, true);

  // Legacy/same-day "ถึง 18:30 น." block auto-clears next day too
  const sunSameDayBlock = {
    ...bank,
    phoneBlockedReason: 'สายเช้าวันอาทิตย์ (เกิน 08:20 น.) งดใช้มือถือถึง 18:30 น.',
    dailyProgress: { ...bank.dailyProgress, dateStr: '2026-11-22' },
  };
  const monCleared = getMemberDailySafe(sunSameDayBlock, '2026-11-23');
  assert.equal(monCleared.phoneBlockedReason, undefined);
});

test('buildWeeklyMonthlySummary aggregates 7-day stars, monthly stars, fines, and Free Day eligibility', () => {
  const now = new Date(2026, 10, 18, 12, 0);
  const state = createDefaultState('2026-11-18');
  const kids = state.members
    .filter((m) => m.role === 'kid')
    .map((k) => ({ ...k, starHistory: k.starHistory.slice(0, 0), lateFineThb: 0, freeDayPenaltyCount: 0 }));
  const j1 = kids.find((k) => k.id === 'j1')!;
  const s1 = kids.find((k) => k.id === 's1')!;

  j1.starHistory = [
    { id: 't1', timestamp: '06:30:00', dateStr: '2026-11-18', amount: 25, label: 'bonus', type: 'staff' },
    { id: 't2', timestamp: '09:00:00', dateStr: '2026-11-05', amount: 40, label: 'earlier month', type: 'earn' },
    { id: 't3', timestamp: '10:00:00', dateStr: '2026-11-17', amount: -10, label: 'snack', type: 'spend' },
  ];
  s1.freeDayPenaltyCount = 1;
  s1.lateFineThb = 30;

  const summary = buildWeeklyMonthlySummary(kids, state.sickReports, now);
  assert.equal(summary.weekStartStr, '2026-11-12');
  assert.equal(summary.monthPrefix, '2026-11');
  assert.equal(summary.freeDayEligibleCount, kids.length - 1);
  assert.equal(summary.freeDayDeductedCount, 1);
  assert.equal(summary.totalLateFinesThb, 30);

  const j1Row = summary.rows.find((r) => r.kid.id === 'j1')!;
  assert.equal(j1Row.earnedStars7d, 25);
  assert.equal(j1Row.earnedStarsMonth, 65);
  assert.equal(j1Row.spentStarsMonth, 10);
  assert.equal(summary.monthlyTopEarners[0].kid.id, 'j1');
});

test('personal hideable piggy bank transfers stars cleanly, tracks streaks/goals, and never inflates starHistory', () => {
  const state = createDefaultState('2026-11-18');
  const kao = state.members.find((m) => m.id === 'j1')!;
  const initialStars = kao.stars;
  const initialHistoryLen = kao.starHistory.length;

  // Deposit 15 stars on Day 1
  const dep1 = depositToPiggyBank(kao, 15, 'ออมหลังกลับจากโรงเรียน', new Date(2026, 10, 18, 16, 40));
  assert.equal(dep1.ok, true);
  assert.equal(dep1.updatedMember.stars, initialStars - 15);
  assert.equal(getSafePiggyBank(dep1.updatedMember).savedStars, 15);
  assert.equal(getSafePiggyBank(dep1.updatedMember).streakDays, 1);
  assert.equal(getTodayPiggyBankDepositTotal(dep1.updatedMember, '2026-11-18'), 15);
  assert.equal(dep1.updatedMember.starHistory.length, initialHistoryLen);

  // Consecutive Day 2 deposit increases streak to 2
  const dep2 = depositToPiggyBank(dep1.updatedMember, 10, 'ออมต่อเนื่องวันที่สอง', new Date(2026, 10, 19, 17, 0));
  assert.equal(dep2.ok, true);
  assert.equal(getSafePiggyBank(dep2.updatedMember).savedStars, 25);
  assert.equal(getSafePiggyBank(dep2.updatedMember).streakDays, 2);

  // Cannot overdraft piggy bank or wallet
  const badDep = depositToPiggyBank(dep2.updatedMember, 99999, 'over', new Date(2026, 10, 19, 17, 5));
  assert.equal(badDep.ok, false);
  const badWd = withdrawFromPiggyBank(dep2.updatedMember, 30, 'over', new Date(2026, 10, 19, 17, 6));
  assert.equal(badWd.ok, false);

  // Valid withdrawal moves stars back to wallet
  const wd1 = withdrawFromPiggyBank(dep2.updatedMember, 10, 'ถอนซื้อขนม', new Date(2026, 10, 19, 17, 10));
  assert.equal(wd1.ok, true);
  assert.equal(wd1.updatedMember.stars, initialStars - 15);
  assert.equal(getSafePiggyBank(wd1.updatedMember).savedStars, 15);

  // Hide toggle and Goal update persist cleanly
  const hidden = togglePiggyBankHidden(wd1.updatedMember, true);
  assert.equal(getSafePiggyBank(hidden).isHidden, true);
  const withGoal = updatePiggyBankGoal(hidden, 'หูฟังสีชมพู', 200);
  assert.equal(getSafePiggyBank(withGoal).goalLabel, 'หูฟังสีชมพู');
  assert.equal(getSafePiggyBank(withGoal).goalStars, 200);
});

test('all kid credentials (PIN, ID, QR) are blocked at back-office login gate while staff/manager/creator succeed', () => {
  const state = createDefaultState('2026-11-18');
  const creatorPins = state.settings.creatorPins;

  // Kid Kao's 4-digit PIN, ID, and QR badge must ALL be blocked from back-office/profile access
  assert.equal(resolveUnifiedLogin('9346', state.members, creatorPins).type, 'kid_blocked');
  assert.equal(resolveUnifiedLogin('j1', state.members, creatorPins).type, 'kid_blocked');
  assert.equal(resolveUnifiedLogin('BARNHEM:j1:9346', state.members, creatorPins).type, 'kid_blocked');

  // Staff PIN & QR still log into Staff Back-office
  assert.equal(resolveUnifiedLogin('9794', state.members, creatorPins).type, 'staff');
  assert.equal(resolveUnifiedLogin('BARNHEM:staff_ek:9794', state.members, creatorPins).type, 'staff');
});

test('door command buttons enforce schedule, early window, deadline, eligible kids, and PIN verification', () => {
  const state = createDefaultState('2026-11-18');
  const commands = createDefaultDoorCommands(state.members);
  assert.equal(commands.length, 9);

  const staffMembers = state.members.filter((m) => m.role === 'staff');
  const kao = state.members.find((m) => m.id === 'j1')!; // Group 1
  const bank = state.members.find((m) => m.id === 's4')!; // Group 2

  const breakfastCmd = commands.find((c) => c.id === 'cmd_breakfast')!;
  // Before 06:00 (06:10 - 10m early) => locked
  assert.equal(getDoorCommandAvailability(breakfastCmd, new Date(2026, 10, 18, 5, 55)).canOpen, false);
  // 06:02 => early window open
  assert.equal(getDoorCommandAvailability(breakfastCmd, new Date(2026, 10, 18, 6, 2)).status, 'early_window');

  // Group 2 kid (bank) is not in breakfastCmd.allowedKidIds
  const notEligible = executeDoorCommand({
    cmd: breakfastCmd,
    kid: bank,
    staffPinInput: '9794',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 6, 20),
  });
  assert.equal(notEligible.ok, false);

  // Wrong staff PIN rejected
  const wrongPin = executeDoorCommand({
    cmd: breakfastCmd,
    kid: kao,
    staffPinInput: '0000',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 6, 20),
  });
  assert.equal(wrongPin.ok, false);

  // Correct staff PIN succeeds & awards +5 stars
  const okStaff = executeDoorCommand({
    cmd: breakfastCmd,
    kid: kao,
    staffPinInput: '9794',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 6, 20),
  });
  assert.equal(okStaff.ok, true);
  assert.equal(okStaff.updatedMember.stars, kao.stars + 5);
  assert.ok(okStaff.updatedMember.dailyProgress.completedCommandIds?.includes('cmd_breakfast'));

  // Kid PIN command: คืนมือถือ after Curfew 21:00 -> deducts Free Day
  const returnCmd = commands.find((c) => c.id === 'cmd_return_phone')!;
  const badKidPin = executeDoorCommand({
    cmd: returnCmd,
    kid: bank,
    kidPinInput: '1111',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 21, 10),
  });
  assert.equal(badKidPin.ok, false);

  const lateKidReturn = executeDoorCommand({
    cmd: returnCmd,
    kid: bank,
    kidPinInput: bank.pin,
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 21, 10),
  });
  assert.equal(lateKidReturn.ok, true);
  assert.equal(lateKidReturn.updatedMember.freeDayPenaltyCount, 1);
  assert.equal(lateKidReturn.updatedMember.dailyProgress.phoneReturnedDone, true);

  // Expired filtering: before_window & open are kept visible; after_window & locked_after_deadline are hidden
  const morningPhoneCmd = commands.find((c) => c.id === 'cmd_morning_phone')!;
  assert.equal(
    isDoorCommandExpired(getDoorCommandAvailability(morningPhoneCmd, new Date(2026, 10, 18, 5, 45))),
    false
  );
  assert.equal(
    isDoorCommandExpired(getDoorCommandAvailability(morningPhoneCmd, new Date(2026, 10, 18, 6, 30))),
    false
  );
  assert.equal(
    isDoorCommandExpired(getDoorCommandAvailability(morningPhoneCmd, new Date(2026, 10, 18, 7, 1))),
    true
  );

  // Dedicated Penalty command: requires staff PIN, applies penalty immediately, supports custom reason & multiple records per day
  const penaltyCmd = commands.find((c) => c.id === 'cmd_penalty')!;
  assert.equal(penaltyCmd.commandKind, 'penalty');
  assert.equal(penaltyCmd.authMode, 'staff_pin');

  const penaltyWrongPin = executeDoorCommand({
    cmd: penaltyCmd,
    kid: kao,
    staffPinInput: '0000',
    penaltyReasonOverride: 'ไม่เก็บจาน',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 18, 15),
  });
  assert.equal(penaltyWrongPin.ok, false);

  const penaltyRes1 = executeDoorCommand({
    cmd: penaltyCmd,
    kid: kao,
    staffPinInput: '9794',
    penaltyReasonOverride: 'ไม่เก็บจาน / ลืมเวร',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 18, 15),
  });
  assert.equal(penaltyRes1.ok, true);
  assert.equal(penaltyRes1.updatedMember.freeDayPenaltyCount, kao.freeDayPenaltyCount + 1);
  assert.match(penaltyRes1.updatedMember.penalties[0].reason, /ไม่เก็บจาน \/ ลืมเวร/);

  // Can record a second punishment on the same day, e.g. deduct_stars clamped >= 0
  const starPenaltyCmd = {
    ...penaltyCmd,
    id: 'cmd_penalty_stars',
    penaltyType: 'deduct_stars' as const,
    penaltyValue: 999,
  };
  const penaltyRes2 = executeDoorCommand({
    cmd: starPenaltyCmd,
    kid: penaltyRes1.updatedMember,
    staffPinInput: '9794',
    penaltyReasonOverride: 'เล่นมือถือนอกเวลา',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 19, 0),
  });
  assert.equal(penaltyRes2.ok, true);
  assert.equal(penaltyRes2.updatedMember.stars, 0);
  assert.ok(penaltyRes2.updatedMember.starHistory[0].amount < 0);

  // custom_task penalty command records without fines/stars and respects customPenaltyLabelTh
  const customTaskCmd = {
    ...penaltyCmd,
    id: 'cmd_penalty_task',
    penaltyType: 'custom_task' as const,
    penaltyValue: 0,
    customPenaltyLabelTh: '🧹 ล้างห้องน้ำ 1 วัน',
  };
  assert.equal(
    formatPenaltyRuleLabel('custom_task', 0, '🧹 ล้างห้องน้ำ 1 วัน'),
    '🧹 ล้างห้องน้ำ 1 วัน'
  );
  const penaltyRes3 = executeDoorCommand({
    cmd: customTaskCmd,
    kid: bank,
    staffPinInput: '9794',
    staffMembers,
    creatorPins: state.settings.creatorPins,
    now: new Date(2026, 10, 18, 19, 10),
  });
  assert.equal(penaltyRes3.ok, true);
  assert.equal(penaltyRes3.updatedMember.penalties[0].reason, '🧹 ล้างห้องน้ำ 1 วัน');
});

test('staff star granting enforces max 5 stars per grant and max 20 stars per day with next-day reset', () => {
  const day1 = new Date(2026, 10, 24, 15, 0);
  const day2 = new Date(2026, 10, 25, 9, 0);
  const state = createDefaultState('2026-11-24');
  let staff = state.members.find((m) => m.id === 'staff_ek')!;
  let kid1 = state.members.find((m) => m.id === 'j1')!;
  let kid2 = state.members.find((m) => m.id === 'j2')!;
  const initialKid1Stars = kid1.stars;

  // Reject > 5 stars per grant or < 1
  const tooMany = grantStarsByStaff({ staff, kid: kid1, amount: 6, reason: 'ช่วยงาน', now: day1 });
  assert.equal(tooMany.ok, false);
  const zeroStars = grantStarsByStaff({ staff, kid: kid1, amount: 0, reason: 'ช่วยงาน', now: day1 });
  assert.equal(zeroStars.ok, false);

  // Grant 5 stars x 3 times = 15 stars
  for (let i = 0; i < 3; i++) {
    const res = grantStarsByStaff({ staff, kid: kid1, amount: 5, reason: 'ทำดี', now: day1 });
    assert.equal(res.ok, true);
    kid1 = res.updatedKid!;
    staff = res.updatedStaff!;
  }
  assert.equal(kid1.stars, initialKid1Stars + 15);
  assert.equal(getStaffStarsGivenToday(staff, '2026-11-24'), 15);
  assert.equal(getStaffRemainingDailyStars(staff, '2026-11-24'), 5);

  // Grant 3 stars to kid2 => 18 used, 2 remaining
  const res4 = grantStarsByStaff({ staff, kid: kid2, amount: 3, reason: 'แบ่งปัน', now: day1 });
  assert.equal(res4.ok, true);
  assert.equal(res4.remainingToday, 2);
  kid2 = res4.updatedKid!;
  staff = res4.updatedStaff!;

  // Attempting 4 stars fails when only 2 remain
  const overQuota = grantStarsByStaff({ staff, kid: kid2, amount: 4, reason: 'เกินโควตา', now: day1 });
  assert.equal(overQuota.ok, false);

  // Granting exact remaining 2 stars succeeds => 20/20
  const exactCap = grantStarsByStaff({ staff, kid: kid2, amount: 2, reason: 'ครบ 20', now: day1 });
  assert.equal(exactCap.ok, true);
  assert.equal(exactCap.remainingToday, 0);
  staff = exactCap.updatedStaff!;

  // Any further grant on day1 fails
  const blocked = grantStarsByStaff({ staff, kid: kid1, amount: 1, reason: 'เพิ่ม', now: day1 });
  assert.equal(blocked.ok, false);

  // Next day resets quota back to 20
  assert.equal(getStaffRemainingDailyStars(staff, '2026-11-25'), 20);
  const nextDayGrant = grantStarsByStaff({ staff, kid: kid1, amount: 5, reason: 'วันใหม่', now: day2 });
  assert.equal(nextDayGrant.ok, true);
  assert.equal(nextDayGrant.remainingToday, 15);
});

test('creator clearKidStars and clearKidPenalties reset stars to 0 and clear fines/penalties cleanly', () => {
  const now = new Date(2026, 10, 24, 16, 0);
  const state = createDefaultState('2026-11-24');
  const kao = state.members.find((m) => m.id === 'j1')!;
  const penalizedKid = {
    ...kao,
    stars: 120,
    lateFineThb: 45,
    freeDayPenaltyCount: 2,
    phoneBlockedReason: 'คืนมือถือเกินเวลา',
    dailyProgress: {
      ...kao.dailyProgress,
      phoneBlockedUntilDate: '2026-11-25',
    },
    penalties: [
      {
        id: 'p1',
        dateStr: '2026-11-24',
        reason: 'มาสาย',
        fineThb: 45,
        resolved: false,
      },
    ],
  };

  const clearedStars = clearKidStars(penalizedKid, now);
  assert.equal(clearedStars.stars, 0);
  assert.equal(clearedStars.starHistory[0].amount, -120);

  const clearedPenalties = clearKidPenalties(clearedStars);
  assert.equal(clearedPenalties.lateFineThb, 0);
  assert.equal(clearedPenalties.freeDayPenaltyCount, 0);
  assert.equal(clearedPenalties.phoneBlockedReason, undefined);
  assert.equal(clearedPenalties.dailyProgress.phoneBlockedUntilDate, undefined);
  assert.equal(clearedPenalties.penalties[0].resolved, true);
});








