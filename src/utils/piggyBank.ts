import { Member, PiggyBankState, PiggyBankTransaction } from '../types/barnhem';
import { addDaysToDateStr, formatDateStr, formatTimeHMS } from './rules';

export const DEFAULT_PIGGY_GOAL_LABEL = 'เป้าหมายพิเศษของฉัน';
export const DEFAULT_PIGGY_GOAL_STARS = 100;

export function getSafePiggyBank(member: Pick<Member, 'piggyBank'>): PiggyBankState {
  const raw = member.piggyBank;
  if (!raw) {
    return {
      savedStars: 0,
      goalStars: DEFAULT_PIGGY_GOAL_STARS,
      goalLabel: DEFAULT_PIGGY_GOAL_LABEL,
      isHidden: false,
      streakDays: 0,
      transactions: [],
    };
  }
  return {
    savedStars: Math.max(0, Math.round(Number(raw.savedStars) || 0)),
    goalStars: Math.max(1, Math.round(Number(raw.goalStars) || DEFAULT_PIGGY_GOAL_STARS)),
    goalLabel: (raw.goalLabel || '').trim() || DEFAULT_PIGGY_GOAL_LABEL,
    isHidden: Boolean(raw.isHidden),
    streakDays: Math.max(0, Math.round(Number(raw.streakDays) || 0)),
    lastDepositDateStr: raw.lastDepositDateStr ? raw.lastDepositDateStr.slice(0, 10) : undefined,
    transactions: Array.isArray(raw.transactions) ? raw.transactions.slice(0, 30) : [],
  };
}

export interface PiggyBankMutationResult {
  ok: boolean;
  updatedMember: Member;
  amount: number;
  errorTh?: string;
  errorEn?: string;
}

export function depositToPiggyBank(
  member: Member,
  rawAmount: number,
  note: string,
  now: Date
): PiggyBankMutationResult {
  const amount = Math.floor(Number(rawAmount) || 0);
  if (amount <= 0) {
    return {
      ok: false,
      updatedMember: member,
      amount: 0,
      errorTh: 'กรุณาระบุจำนวนดาวตั้งแต่ 1 ดาวขึ้นไป',
      errorEn: 'Please enter at least 1 star to deposit.',
    };
  }
  if (member.stars < amount) {
    return {
      ok: false,
      updatedMember: member,
      amount: 0,
      errorTh: `ดาวในกระเป๋าหลักไม่พอ (มี ${member.stars.toLocaleString()} ⭐)`,
      errorEn: `Not enough stars in wallet (you have ${member.stars.toLocaleString()} ⭐).`,
    };
  }

  const todayStr = formatDateStr(now);
  const yesterdayStr = addDaysToDateStr(todayStr, -1);
  const timeStr = formatTimeHMS(now);
  const current = getSafePiggyBank(member);

  let nextStreak = 1;
  if (current.lastDepositDateStr === todayStr) {
    nextStreak = Math.max(1, current.streakDays);
  } else if (current.lastDepositDateStr === yesterdayStr) {
    nextStreak = current.streakDays + 1;
  }

  const tx: PiggyBankTransaction = {
    id: `piggy_dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dateStr: todayStr,
    timestamp: timeStr,
    type: 'deposit',
    amount,
    note: note.trim().slice(0, 100) || 'หยอดกระปุกออมสิน',
  };

  return {
    ok: true,
    amount,
    updatedMember: {
      ...member,
      stars: member.stars - amount,
      piggyBank: {
        ...current,
        savedStars: current.savedStars + amount,
        streakDays: nextStreak,
        lastDepositDateStr: todayStr,
        transactions: [tx, ...current.transactions].slice(0, 30),
      },
    },
  };
}

export function withdrawFromPiggyBank(
  member: Member,
  rawAmount: number,
  note: string,
  now: Date
): PiggyBankMutationResult {
  const current = getSafePiggyBank(member);
  const amount = Math.floor(Number(rawAmount) || 0);
  if (amount <= 0) {
    return {
      ok: false,
      updatedMember: member,
      amount: 0,
      errorTh: 'กรุณาระบุจำนวนดาวที่ต้องการถอนตั้งแต่ 1 ดาวขึ้นไป',
      errorEn: 'Please enter at least 1 star to withdraw.',
    };
  }
  if (current.savedStars < amount) {
    return {
      ok: false,
      updatedMember: member,
      amount: 0,
      errorTh: `ยอดในกระปุกไม่พอถอน (ออมไว้ ${current.savedStars.toLocaleString()} ⭐)`,
      errorEn: `Not enough saved stars in piggy bank (${current.savedStars.toLocaleString()} ⭐).`,
    };
  }

  const todayStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);

  const tx: PiggyBankTransaction = {
    id: `piggy_wd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dateStr: todayStr,
    timestamp: timeStr,
    type: 'withdraw',
    amount,
    note: note.trim().slice(0, 100) || 'ถอนจากกระปุกเข้ากระเป๋าหลัก',
  };

  return {
    ok: true,
    amount,
    updatedMember: {
      ...member,
      stars: member.stars + amount,
      piggyBank: {
        ...current,
        savedStars: current.savedStars - amount,
        transactions: [tx, ...current.transactions].slice(0, 30),
      },
    },
  };
}

export function updatePiggyBankGoal(
  member: Member,
  goalLabel: string,
  goalStars: number
): Member {
  const current = getSafePiggyBank(member);
  return {
    ...member,
    piggyBank: {
      ...current,
      goalLabel: goalLabel.trim().slice(0, 80) || DEFAULT_PIGGY_GOAL_LABEL,
      goalStars: Math.max(1, Math.min(1000000, Math.round(Number(goalStars) || DEFAULT_PIGGY_GOAL_STARS))),
    },
  };
}

export function togglePiggyBankHidden(member: Member, nextHidden?: boolean): Member {
  const current = getSafePiggyBank(member);
  return {
    ...member,
    piggyBank: {
      ...current,
      isHidden: typeof nextHidden === 'boolean' ? nextHidden : !current.isHidden,
    },
  };
}

export function getTodayPiggyBankDepositTotal(member: Pick<Member, 'piggyBank'>, todayStr: string): number {
  const current = getSafePiggyBank(member);
  return current.transactions
    .filter((t) => t.type === 'deposit' && t.dateStr === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);
}
