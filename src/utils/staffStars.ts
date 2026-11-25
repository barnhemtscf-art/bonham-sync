import { Member } from '../types/barnhem';
import { formatDateStr, formatTimeHMS, getMemberDailySafe } from './rules';

export const STAFF_MAX_STARS_PER_GRANT = 5;
export const STAFF_MAX_STARS_PER_DAY = 20;

export function getStaffStarsGivenToday(staff: Member, todayStr: string): number {
  const safeStaff = getMemberDailySafe(staff, todayStr);
  const raw = Number(safeStaff.dailyProgress.staffStarsGivenToday ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

export function getStaffRemainingDailyStars(staff: Member, todayStr: string): number {
  return Math.max(0, STAFF_MAX_STARS_PER_DAY - getStaffStarsGivenToday(staff, todayStr));
}

export interface StaffStarGrantResult {
  ok: boolean;
  updatedKid?: Member;
  updatedStaff?: Member;
  remainingToday: number;
  errorTitleTh?: string;
  errorMessageTh?: string;
}

export function grantStarsByStaff({
  staff,
  kid,
  amount,
  reason,
  now,
}: {
  staff: Member;
  kid: Member;
  amount: number;
  reason?: string;
  now: Date;
}): StaffStarGrantResult {
  const todayStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);
  const safeStaff = getMemberDailySafe(staff, todayStr);
  const safeKid = getMemberDailySafe(kid, todayStr);

  const givenToday = getStaffStarsGivenToday(safeStaff, todayStr);
  const remainingToday = Math.max(0, STAFF_MAX_STARS_PER_DAY - givenToday);

  if (!Number.isInteger(amount) || amount < 1) {
    return {
      ok: false,
      remainingToday,
      errorTitleTh: 'จำนวนดาวไม่ถูกต้อง',
      errorMessageTh: `กรุณาระบุจำนวนดาวเป็นตัวเลขตั้งแต่ 1 ถึง ${STAFF_MAX_STARS_PER_GRANT} ดาว`,
    };
  }

  if (amount > STAFF_MAX_STARS_PER_GRANT) {
    return {
      ok: false,
      remainingToday,
      errorTitleTh: `ให้ดาวได้ครั้งละไม่เกิน ${STAFF_MAX_STARS_PER_GRANT} ⭐`,
      errorMessageTh: `พี่เลี้ยงสามารถให้ดาวน้องได้สูงสุดครั้งละ ${STAFF_MAX_STARS_PER_GRANT} ดาวเท่านั้นค่ะ`,
    };
  }

  if (remainingToday <= 0) {
    return {
      ok: false,
      remainingToday: 0,
      errorTitleTh: `ครบโควตาให้ดาววันนี้แล้ว (${STAFF_MAX_STARS_PER_DAY}/${STAFF_MAX_STARS_PER_DAY} ⭐)`,
      errorMessageTh: `วันนี้ ${staff.nickname} ให้ดาวครบ ${STAFF_MAX_STARS_PER_DAY} ดาวแล้ว สิทธิ์จะรีเซ็ตใหม่ในวันพรุ่งนี้ค่ะ`,
    };
  }

  if (amount > remainingToday) {
    return {
      ok: false,
      remainingToday,
      errorTitleTh: 'เกินโควตาดาวที่เหลือวันนี้',
      errorMessageTh: `วันนี้ ${staff.nickname} เหลือสิทธิ์ให้ดาวอีก ${remainingToday} ⭐ (จากทั้งหมด ${STAFF_MAX_STARS_PER_DAY} ⭐/วัน)`,
    };
  }

  const cleanReason = (reason || '').trim() || 'ชมเชย / ทำความดี';
  const nextKidStars = safeKid.stars + amount;
  const nextGivenToday = givenToday + amount;

  const updatedKid: Member = {
    ...safeKid,
    stars: nextKidStars,
    dailyProgress: {
      ...safeKid.dailyProgress,
      dateStr: todayStr,
      kudosNote: {
        message: cleanReason,
        amount,
        fromStaff: staff.nickname,
        time: timeStr,
      },
    },
    starHistory: [
      {
        id: `staff_grant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        dateStr: todayStr,
        amount,
        label: `พี่เลี้ยงให้ดาว: ${cleanReason} (${staff.nickname})`,
        type: 'staff',
      },
      ...safeKid.starHistory,
    ],
  };

  const updatedStaff: Member = {
    ...safeStaff,
    dailyProgress: {
      ...safeStaff.dailyProgress,
      dateStr: todayStr,
      staffStarsGivenToday: nextGivenToday,
    },
  };

  return {
    ok: true,
    updatedKid,
    updatedStaff,
    remainingToday: STAFF_MAX_STARS_PER_DAY - nextGivenToday,
  };
}

export function clearKidStars(kid: Member, now: Date): Member {
  const todayStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);
  const safeKid = getMemberDailySafe(kid, todayStr);
  const previousStars = Math.max(0, Math.round(safeKid.stars));

  return {
    ...safeKid,
    stars: 0,
    starHistory:
      previousStars > 0
        ? [
            {
              id: `creator_clear_stars_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              timestamp: timeStr,
              dateStr: todayStr,
              amount: -previousStars,
              label: 'ผู้สร้างเคลียร์ยอดดาวเป็น 0 ⭐',
              type: 'staff',
            },
            ...safeKid.starHistory,
          ]
        : safeKid.starHistory,
  };
}

export function clearKidPenalties(kid: Member): Member {
  const { phoneBlockedUntilDate: _ignored, ...restDailyProgress } = kid.dailyProgress;
  return {
    ...kid,
    lateFineThb: 0,
    freeDayPenaltyCount: 0,
    phoneBlockedReason: undefined,
    dailyProgress: restDailyProgress,
    penalties: kid.penalties.map((p) => ({ ...p, resolved: true })),
  };
}
