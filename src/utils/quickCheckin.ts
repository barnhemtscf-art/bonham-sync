import { ActionEvaluation, evaluateGroup1Breakfast, evaluateGroup1ExtraStudy, evaluateGroup1Housework, evaluateGroup1Van, evaluateGroup2Morning, evaluateGroup2PhoneReturn, evaluateGroup3Evening, evaluateGroup3Morning, evaluateGroup3NightReturn, formatDateStr, formatTimeHMS, getGroup1DailyBossSubject } from './rules';
import { Member } from '../types/barnhem';

export type QuickCheckinActionId =
  | 'g1_breakfast'
  | 'g1_van'
  | 'g1_home'
  | 'g1_study'
  | 'g1_housework'
  | 'g1_boss'
  | 'g2_morning'
  | 'g2_home'
  | 'g2_evening_phone'
  | 'g2_return_phone'
  | 'g3_morning'
  | 'g3_home'
  | 'g3_return_phone';

export interface QuickCheckinOption {
  id: QuickCheckinActionId;
  emoji: string;
  labelTh: string;
  alreadyDone: boolean;
}

export function getQuickCheckinActionsForKid(kid: Member, todayStr: string): QuickCheckinOption[] {
  const dp = kid.dailyProgress.dateStr === todayStr ? kid.dailyProgress : { dateStr: todayStr };

  if (kid.ageGroup === 1) {
    return [
      { id: 'g1_breakfast', emoji: '🍚', labelTh: 'ข้าวเช้า', alreadyDone: Boolean(dp.breakfastDone) },
      { id: 'g1_van', emoji: '🚐', labelTh: 'ขึ้นรถตู้', alreadyDone: Boolean(dp.vanDone) },
      { id: 'g1_home', emoji: '🏡', labelTh: 'กลับบ้าน 16:30', alreadyDone: Boolean(dp.homeCheckInDone) },
      { id: 'g1_study', emoji: '📚', labelTh: 'เรียนเสริม', alreadyDone: Boolean(dp.extraStudyDone) },
      { id: 'g1_housework', emoji: '🧹', labelTh: 'งานบ้าน', alreadyDone: Boolean(dp.houseworkDone) },
      { id: 'g1_boss', emoji: '📺', labelTh: 'ด่านบอส 20:00', alreadyDone: Boolean(dp.bossStageDone) },
    ];
  }

  if (kid.ageGroup === 2) {
    return [
      { id: 'g2_morning', emoji: '🎒', labelTh: 'เช็คอินเช้า', alreadyDone: Boolean(dp.morningPhoneCheckedOut) },
      { id: 'g2_home', emoji: '📦', labelTh: 'กลับบ้าน/เก็บมือถือ', alreadyDone: Boolean(dp.homeCheckInDone) },
      { id: 'g2_evening_phone', emoji: '📱', labelTh: 'รับมือถือ 18:30', alreadyDone: Boolean(dp.eveningPhoneUnlocked) },
      { id: 'g2_return_phone', emoji: '🌙', labelTh: 'คืนมือถือค่ำ', alreadyDone: Boolean(dp.phoneReturnedDone) },
    ];
  }

  return [
    { id: 'g3_morning', emoji: '🎓', labelTh: 'ไปฝึกงาน/เรียน', alreadyDone: Boolean(dp.morningPhoneCheckedOut) },
    { id: 'g3_home', emoji: '🏡', labelTh: 'กลับบ้าน/เก็บมือถือ', alreadyDone: Boolean(dp.homeCheckInDone) },
    { id: 'g3_return_phone', emoji: '🌙', labelTh: 'คืนมือถือ 22:45', alreadyDone: Boolean(dp.phoneReturnedDone) },
  ];
}

export interface QuickCheckinResult {
  updatedMember: Member;
  alreadyDone: boolean;
  titleTh: string;
  messageTh: string;
  tone: 'mint' | 'pink' | 'yellow' | 'peach' | 'blue';
}

export function applyQuickCheckin(
  kid: Member,
  actionId: QuickCheckinActionId,
  now: Date,
  staffNickname: string,
  isHolidayToday = false
): QuickCheckinResult {
  const todayStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);
  const currentDp = kid.dailyProgress.dateStr === todayStr ? kid.dailyProgress : { dateStr: todayStr };

  const actions = getQuickCheckinActionsForKid(
    { ...kid, dailyProgress: currentDp },
    todayStr
  );
  const matchedAction = actions.find((a) => a.id === actionId);
  if (matchedAction?.alreadyDone) {
    return {
      updatedMember: kid,
      alreadyDone: true,
      titleTh: `${kid.nickname} เช็คอิน "${matchedAction.labelTh}" แล้ววันนี้`,
      messageTh: 'ระบบบันทึกภารกิจนี้ของวันนี้ไว้เรียบร้อยแล้ว ไม่มีการบวกดาวซ้ำจ้า',
      tone: 'blue',
    };
  }

  const mergeEval = (
    evalRes: ActionEvaluation,
    progressPatch: Partial<Member['dailyProgress']>,
    label: string,
    extraPatch?: Partial<Member>
  ): QuickCheckinResult => {
    const nextPenalties = [...kid.penalties];
    if (evalRes.fineThb > 0 || evalRes.phoneBlockedReason || evalRes.freeDayPenaltyDelta) {
      nextPenalties.unshift({
        id: `pen_${Date.now()}`,
        dateStr: todayStr,
        reason: evalRes.phoneBlockedReason || evalRes.titleTh,
        fineThb: evalRes.fineThb,
        phoneRestrictedUntil: evalRes.phoneBlockedReason,
        freeDayDeducted: evalRes.freeDayPenaltyDelta,
        resolved: false,
      });
    }

    const nextHistory = [...kid.starHistory];
    if (evalRes.starsAwarded > 0) {
      nextHistory.unshift({
        id: `quick_${Date.now()}`,
        timestamp: timeStr,
        dateStr: todayStr,
        amount: evalRes.starsAwarded,
        label: `${label} · เช็คอินด่วนโดย ${staffNickname}`,
        type: 'earn',
      });
    }

    const updatedMember: Member = {
      ...kid,
      ...extraPatch,
      stars: kid.stars + evalRes.starsAwarded,
      lateFineThb: kid.lateFineThb + evalRes.fineThb,
      freeDayPenaltyCount: kid.freeDayPenaltyCount + (evalRes.freeDayPenaltyDelta || 0),
      phoneBlockedReason: evalRes.phoneBlockedReason || kid.phoneBlockedReason,
      dailyProgress: {
        ...currentDp,
        dateStr: todayStr,
        ...(evalRes.phoneBlockedUntilDate
          ? { phoneBlockedUntilDate: evalRes.phoneBlockedUntilDate }
          : {}),
        ...progressPatch,
      },
      penalties: nextPenalties,
      starHistory: nextHistory,
    };

    return {
      updatedMember,
      alreadyDone: false,
      titleTh: `${kid.nickname}: ${evalRes.titleTh}`,
      messageTh: `${evalRes.messageTh}\n(เช็คอินด่วนโดย ${staffNickname})`,
      tone: evalRes.tone,
    };
  };

  switch (actionId) {
    case 'g1_breakfast':
      return mergeEval(
        evaluateGroup1Breakfast(now, isHolidayToday),
        { breakfastDone: true },
        'เช็คอินกินข้าวเช้า (กลุ่ม 1)'
      );
    case 'g1_van':
      return mergeEval(
        evaluateGroup1Van(now, isHolidayToday),
        { vanDone: true },
        'เช็คอินขึ้นรถตู้ (กลุ่ม 1)'
      );
    case 'g1_home':
      return {
        updatedMember: {
          ...kid,
          dailyProgress: {
            ...currentDp,
            dateStr: todayStr,
            homeCheckInDone: true,
            speedyNinjaStartMs: now.getTime(),
          },
        },
        alreadyDone: false,
        titleTh: `${kid.nickname}: เช็คอินกลับบ้าน 16:30 สำเร็จ 🥷`,
        messageTh: `เริ่มภารกิจ Speedy Ninja 20 นาทีแล้ว (เช็คอินด่วนโดย ${staffNickname})`,
        tone: 'blue',
      };
    case 'g1_study':
      return mergeEval(evaluateGroup1ExtraStudy(now), { extraStudyDone: true }, 'ด่านเรียนเสริม (กลุ่ม 1)');
    case 'g1_housework':
      return mergeEval(evaluateGroup1Housework(now), { houseworkDone: true }, 'งานบ้าน & ตากชุด (กลุ่ม 1)');
    case 'g1_boss': {
      const bossSubject = getGroup1DailyBossSubject(now);
      return mergeEval(
        {
          starsAwarded: 10,
          fineThb: 0,
          isLate: false,
          titleTh: 'ปลดล็อกด่านบอส 20:00 สำเร็จ! +10 ⭐',
          messageTh: `${bossSubject.th} · ได้สิทธิ์ดูการ์ตูน (หยุด 20:40 น. เข้านอน 21:00 น.)`,
          titleEn: 'Boss Stage Unlocked',
          messageEn: 'Cartoon unlocked',
          tone: 'mint',
        },
        { bossStageDone: true },
        `ด่านบอส 20:00 (${bossSubject.th})`,
        { cartoonUnlockedToday: true }
      );
    }
    case 'g2_morning':
      return mergeEval(
        evaluateGroup2Morning(now, Boolean(currentDp.isSickToday), isHolidayToday),
        { morningPhoneCheckedOut: true },
        'เช็คอินกะเช้า (กลุ่ม 2)'
      );
    case 'g2_home':
      return mergeEval(
        {
          starsAwarded: 5,
          fineThb: 0,
          isLate: false,
          titleTh: 'กลับบ้าน & เก็บมือถือเข้ากล่อง +5 ⭐',
          messageTh: 'บันทึกกลับบ้านและเก็บมือถือเข้ากล่องเรียบร้อย',
          titleEn: 'Phone Stored',
          messageEn: 'Phone stored +5 stars',
          tone: 'mint',
        },
        { homeCheckInDone: true },
        'กลับบ้าน & เก็บมือถือเข้ากล่อง (กลุ่ม 2)'
      );
    case 'g2_evening_phone':
      return mergeEval(
        {
          starsAwarded: 10,
          fineThb: 0,
          isLate: false,
          titleTh: 'ปลดล็อกรับมือถือรอบเย็น 18:30 +10 ⭐',
          messageTh: 'เช็คอินรับมือถือรอบเย็นสำเร็จ (ตรวจเช็คลิสต์ครบ)',
          titleEn: 'Evening Phone Released',
          messageEn: 'Evening phone released +10 stars',
          tone: 'mint',
        },
        { eveningChecklistDone: true, eveningPhoneUnlocked: true },
        'รับมือถือรอบเย็น 18:30 (กลุ่ม 2)'
      );
    case 'g2_return_phone':
      return mergeEval(
        evaluateGroup2PhoneReturn(now, Boolean(currentDp.homeworkRegisteredSubject)),
        { phoneReturnedDone: true },
        'ส่งคืนมือถือรอบค่ำ (กลุ่ม 2)'
      );
    case 'g3_morning':
      return mergeEval(evaluateGroup3Morning(), { morningPhoneCheckedOut: true }, 'เช็คอินไปฝึกงาน/เรียน (กลุ่ม 3)');
    case 'g3_home':
      return mergeEval(evaluateGroup3Evening(), { homeCheckInDone: true }, 'กลับบ้านเก็บมือถือเข้าตู้ (กลุ่ม 3)');
    case 'g3_return_phone':
      return mergeEval(evaluateGroup3NightReturn(now), { phoneReturnedDone: true }, 'ส่งคืนมือถือ Curfew 22:45 (กลุ่ม 3)');
  }
}

export function hasAnyDailyCommandDone(kid: Member, todayStr: string): boolean {
  const dp = kid.dailyProgress.dateStr === todayStr ? kid.dailyProgress : { dateStr: todayStr };
  return Boolean(
    dp.breakfastDone ||
      dp.vanDone ||
      dp.homeCheckInDone ||
      dp.speedyNinjaStartMs ||
      dp.extraStudyDone ||
      dp.houseworkDone ||
      dp.bossStageDone ||
      dp.morningPhoneCheckedOut ||
      dp.eveningChecklistDone ||
      dp.eveningPhoneUnlocked ||
      dp.homeworkRegisteredSubject ||
      dp.phoneReturnedDone ||
      (dp.completedCommandIds && dp.completedCommandIds.length > 0) ||
      kid.cartoonUnlockedToday
  );
}

export function resetKidDailyCommands(kid: Member, todayStr: string): Member {
  const sameDay = kid.dailyProgress.dateStr === todayStr;
  const preserveSick = sameDay && Boolean(kid.dailyProgress.isSickToday);
  const preserveKudos = sameDay ? kid.dailyProgress.kudosNote : undefined;
  const preserveBlockedUntil = sameDay ? kid.dailyProgress.phoneBlockedUntilDate : undefined;
  return {
    ...kid,
    cartoonUnlockedToday: false,
    dailyProgress: {
      dateStr: todayStr,
      ...(preserveSick ? { isSickToday: true } : {}),
      ...(preserveKudos ? { kudosNote: preserveKudos } : {}),
      ...(preserveBlockedUntil ? { phoneBlockedUntilDate: preserveBlockedUntil } : {}),
    },
  };
}

