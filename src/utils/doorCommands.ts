import {
  DoorCommandConfig,
  DoorCommandPenaltyType,
  Member,
} from '../types/barnhem';
import { addDaysToDateStr, formatDateStr, formatTimeHMS, minutesOfDay } from './rules';

export function parseTimeHHMM(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!match) return 0;
  const h = Math.max(0, Math.min(23, Number(match[1])));
  const m = Math.max(0, Math.min(59, Number(match[2])));
  return h * 60 + m;
}

export function formatMinutesAsHHMM(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createDefaultDoorCommands(members: Member[]): DoorCommandConfig[] {
  const kids = members.filter((m) => m.role === 'kid');
  const g1Ids = kids.filter((k) => k.ageGroup === 1).map((k) => k.id);
  const g2Ids = kids.filter((k) => k.ageGroup === 2).map((k) => k.id);
  const g3Ids = kids.filter((k) => k.ageGroup === 3).map((k) => k.id);
  const g2And3Ids = [...g2Ids, ...g3Ids];
  const allKidIds = kids.map((k) => k.id);

  return [
    {
      id: 'cmd_morning_phone',
      titleTh: 'มาขอรับมือถือ',
      descriptionTh: 'เช็คอินรับมือถือช่วงเช้าก่อนไปโรงเรียน / ฝึกงาน',
      emoji: '📱',
      startTime: '06:00',
      endTime: '07:00',
      earlyMinutes: 5,
      deadlineTime: '07:00',
      authMode: 'direct',
      rewardStars: 5,
      penaltyType: 'block',
      penaltyValue: 0,
      penaltyNoteTh: 'ล็อกเมื่อเลย 07:00 น.',
      allowedKidIds: g2Ids.slice(0, 7).length > 0 ? g2Ids.slice(0, 7) : g2Ids,
      enabled: true,
    },
    {
      id: 'cmd_breakfast',
      titleTh: 'กินข้าวเช้า',
      descriptionTh: 'เช็คอินทานข้าวเช้าน้องกลุ่ม 1 (ก่อน 06:40 น. รับ +5 ⭐)',
      emoji: '🍚',
      startTime: '06:10',
      endTime: '07:30',
      earlyMinutes: 10,
      deadlineTime: '06:40',
      authMode: 'staff_pin',
      rewardStars: 5,
      penaltyType: 'none',
      penaltyValue: 0,
      penaltyNoteTh: 'เลย 06:40 น. ไม่ได้รับดาวรอบเช้า',
      allowedKidIds: g1Ids,
      enabled: true,
    },
    {
      id: 'cmd_school',
      titleTh: 'ไปโรงเรียน',
      descriptionTh: 'เช็คอินขึ้นรถตู้ / ออกเดินทางไปโรงเรียนหรือฝึกงาน',
      emoji: '🚌',
      startTime: '06:30',
      endTime: '07:30',
      earlyMinutes: 10,
      deadlineTime: '07:21',
      authMode: 'staff_pin',
      rewardStars: 10,
      penaltyType: 'fine_per_min',
      penaltyValue: 5,
      penaltyNoteTh: 'เลย 07:21 น. ปรับนาทีละ 5 บาท (สูงสุด 50 บาท · ยกเว้นป่วย/วันหยุด)',
      allowedKidIds: allKidIds.filter((id) => id !== g3Ids[1]).slice(0, 14),
      enabled: true,
    },
    {
      id: 'cmd_home',
      titleTh: 'กลับบ้านแล้ว',
      descriptionTh: 'เช็คอินกลับถึงบ้านเรียบร้อย เก็บมือถือและเปลี่ยนชุด',
      emoji: '🏡',
      startTime: '15:00',
      endTime: '17:00',
      earlyMinutes: 15,
      deadlineTime: '17:00',
      authMode: 'direct',
      rewardStars: 5,
      penaltyType: 'none',
      penaltyValue: 0,
      penaltyNoteTh: 'เลยเวลาปิดรับเช็คอิน',
      allowedKidIds: g2Ids.concat(g3Ids.slice(0, 1)),
      enabled: true,
    },
    {
      id: 'cmd_evening_phone',
      titleTh: 'ตรวจชุด & รับมือถือ',
      descriptionTh: 'ซัก-รีด-ตรวจชุดนักเรียน & อาบน้ำเรียบร้อย รับมือถือรอบเย็น',
      emoji: '👕',
      startTime: '18:00',
      endTime: '20:30',
      earlyMinutes: 10,
      deadlineTime: '19:30',
      authMode: 'direct',
      rewardStars: 10,
      penaltyType: 'none',
      penaltyValue: 0,
      penaltyNoteTh: 'เลย 19:30 น. ไม่ได้รับโบนัสดาวตรงเวลา',
      allowedKidIds: g2Ids.concat(g3Ids.slice(0, 1)),
      enabled: true,
    },
    {
      id: 'cmd_cartoon',
      titleTh: 'ปลดล็อคดูการ์ตูน',
      descriptionTh: 'ผ่านด่านทบทวนภาษา 20:00 น. รับสิทธิ์ดูการ์ตูน 20:00–20:40 น.',
      emoji: '📺',
      startTime: '20:00',
      endTime: '20:40',
      earlyMinutes: 5,
      deadlineTime: '20:40',
      authMode: 'direct',
      rewardStars: 10,
      penaltyType: 'block',
      penaltyValue: 0,
      penaltyNoteTh: 'หมดเวลาดูการ์ตูน 20:40 น.',
      allowedKidIds: g1Ids,
      enabled: true,
    },
    {
      id: 'cmd_homework',
      titleTh: 'ขออนุญาตทำการบ้าน',
      descriptionTh: 'ลงทะเบียนใช้อุปกรณ์ทำการบ้านต่อหลัง 21:00 น. (ถึง 22:45 น.)',
      emoji: '✍️',
      startTime: '20:30',
      endTime: '20:45',
      earlyMinutes: 5,
      deadlineTime: '20:45',
      authMode: 'kid_pin',
      rewardStars: 5,
      penaltyType: 'block',
      penaltyValue: 0,
      penaltyNoteTh: 'ต้องขออนุญาตก่อน 20:45 น.',
      allowedKidIds: g2Ids.concat(g3Ids.slice(0, 1)),
      enabled: true,
    },
    {
      id: 'cmd_return_phone',
      titleTh: 'คืนมือถือ',
      descriptionTh: 'ส่งคืนมือถือเข้าตู้ก่อน Curfew 21:00 น.',
      emoji: '🌙',
      startTime: '20:46',
      endTime: '23:00',
      earlyMinutes: 5,
      deadlineTime: '21:00',
      authMode: 'kid_pin',
      rewardStars: 5,
      penaltyType: 'deduct_free_day',
      penaltyValue: 1,
      penaltyNoteTh: 'คืนเกิน Curfew 21:00 น. หักสิทธิ์ Free Day วันศุกร์ 1 วัน',
      allowedKidIds: g2And3Ids,
      enabled: true,
    },
    {
      id: 'cmd_penalty',
      commandKind: 'penalty',
      titleTh: 'บทลงโทษ',
      descriptionTh: 'บันทึกบทลงโทษประจำวัน (พี่เลี้ยงใส่ PIN ยืนยันเพื่อบันทึกโทษทันที)',
      emoji: '⚖️',
      startTime: '00:00',
      endTime: '23:59',
      earlyMinutes: 0,
      deadlineTime: '23:59',
      authMode: 'staff_pin',
      rewardStars: 0,
      penaltyType: 'deduct_free_day',
      penaltyValue: 1,
      penaltyNoteTh: 'ทำผิดกติกาบ้าน — หักสิทธิ์ Free Day 1 วัน (หรือระบุรายละเอียดเพิ่มเติม)',
      allowedKidIds: allKidIds,
      enabled: true,
    },
  ];
}

export function resolveDoorCommands(
  configured: DoorCommandConfig[] | undefined,
  members: Member[]
): DoorCommandConfig[] {
  if (Array.isArray(configured) && configured.length > 0) {
    return configured;
  }
  return createDefaultDoorCommands(members);
}

export type DoorCommandWindowStatus =
  | 'before_window'
  | 'early_window'
  | 'open_ontime'
  | 'open_late'
  | 'locked_after_deadline'
  | 'after_window';

export interface DoorCommandAvailability {
  status: DoorCommandWindowStatus;
  canOpen: boolean;
  isLate: boolean;
  minutesLate: number;
  minutesUntilOpen: number;
  badgeLabelTh: string;
  badgeLabelEn: string;
}

export function getDoorCommandAvailability(
  cmd: DoorCommandConfig,
  now: Date,
  isHolidayToday = false
): DoorCommandAvailability {
  const nowMins = minutesOfDay(now);
  const startMins = parseTimeHHMM(cmd.startTime);
  const endMins = Math.max(startMins, parseTimeHHMM(cmd.endTime));
  const earlyMins = Math.max(0, Math.min(180, Math.round(cmd.earlyMinutes || 0)));
  const openMins = Math.max(0, startMins - earlyMins);
  const rawDeadlineMins = parseTimeHHMM(cmd.deadlineTime || cmd.endTime);
  const deadlineMins = Math.max(openMins, Math.min(endMins, rawDeadlineMins));

  if (nowMins < openMins) {
    return {
      status: 'before_window',
      canOpen: false,
      isLate: false,
      minutesLate: 0,
      minutesUntilOpen: openMins - nowMins,
      badgeLabelTh: 'ล็อกนอกเวลา',
      badgeLabelEn: 'Locked',
    };
  }

  if (nowMins > endMins) {
    return {
      status: 'after_window',
      canOpen: false,
      isLate: false,
      minutesLate: 0,
      minutesUntilOpen: 0,
      badgeLabelTh: 'ล็อกนอกเวลา',
      badgeLabelEn: 'Closed',
    };
  }

  if (nowMins < startMins) {
    return {
      status: 'early_window',
      canOpen: true,
      isLate: false,
      minutesLate: 0,
      minutesUntilOpen: 0,
      badgeLabelTh: `ก่อนเวลาได้ (-${startMins - nowMins} น.)`,
      badgeLabelEn: `Early (-${startMins - nowMins}m)`,
    };
  }

  if (nowMins <= deadlineMins || isHolidayToday) {
    return {
      status: 'open_ontime',
      canOpen: true,
      isLate: false,
      minutesLate: 0,
      minutesUntilOpen: 0,
      badgeLabelTh: 'เปิดให้กด',
      badgeLabelEn: 'Open',
    };
  }

  // Past deadline, still before endTime
  const minutesLate = nowMins - deadlineMins;
  if (cmd.penaltyType === 'block') {
    return {
      status: 'locked_after_deadline',
      canOpen: false,
      isLate: true,
      minutesLate,
      minutesUntilOpen: 0,
      badgeLabelTh: 'เลยเส้นตาย',
      badgeLabelEn: 'Deadline Passed',
    };
  }

  return {
    status: 'open_late',
    canOpen: true,
    isLate: true,
    minutesLate,
    minutesUntilOpen: 0,
    badgeLabelTh: 'เลยเส้นตาย (บันทึกโทษ)',
    badgeLabelEn: 'Late (Penalty)',
  };
}

export function isDoorCommandExpired(availability: DoorCommandAvailability): boolean {
  return (
    availability.status === 'after_window' ||
    availability.status === 'locked_after_deadline'
  );
}

export function formatAuthModeLabel(authMode: DoorCommandConfig['authMode']): string {
  if (authMode === 'staff_pin') return '🧑‍🏫 พี่เลี้ยงใส่ PIN';
  if (authMode === 'kid_pin') return '🔑 น้องใส่ PIN เอง';
  return '👆 กดชื่อได้เลย';
}

export function formatPenaltyRuleLabel(
  penaltyType: DoorCommandPenaltyType,
  penaltyValue: number,
  customPenaltyLabelTh?: string
): string {
  switch (penaltyType) {
    case 'block':
      return 'ล็อกปุ่มทันทีเมื่อเลยเส้นตาย';
    case 'fine_per_min':
      return `ปรับนาทีละ ${Math.max(1, penaltyValue || 5)} บาท (สูงสุด 50 บ.)`;
    case 'fixed_fine':
      return `ปรับเงิน ${Math.max(1, penaltyValue || 10)} บาท`;
    case 'deduct_free_day':
      return `หัก Free Day ${Math.max(1, penaltyValue || 1)} วัน`;
    case 'deduct_stars':
      return `หักดาว ${Math.max(1, penaltyValue || 10)} ⭐`;
    case 'block_phone_today':
      return 'งดใช้มือถือวันนี้ถึง 18:30 น.';
    case 'block_phone_tomorrow':
      return 'งดใช้มือถือวันพรุ่งนี้ 1 วัน';
    case 'custom_task':
      return customPenaltyLabelTh?.trim() || 'บันทึกบทลงโทษ / เวรพิเศษ';
    default:
      return 'ไม่ได้ดาวเมื่อเลยเส้นตาย';
  }
}

export interface ExecuteDoorCommandParams {
  cmd: DoorCommandConfig;
  kid: Member;
  staffPinInput?: string;
  kidPinInput?: string;
  penaltyReasonOverride?: string;
  staffMembers: Member[];
  creatorPins: string[];
  now: Date;
  isHolidayToday?: boolean;
}

export interface ExecuteDoorCommandResult {
  ok: boolean;
  updatedMember: Member;
  titleTh: string;
  messageTh: string;
  tone: 'mint' | 'pink' | 'yellow' | 'blue' | 'peach';
}

export function executeDoorCommand({
  cmd,
  kid,
  staffPinInput = '',
  kidPinInput = '',
  penaltyReasonOverride = '',
  staffMembers,
  creatorPins,
  now,
  isHolidayToday = false,
}: ExecuteDoorCommandParams): ExecuteDoorCommandResult {
  const todayStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);
  const isPenaltyCmd = cmd.commandKind === 'penalty';

  if (!cmd.enabled) {
    return {
      ok: false,
      updatedMember: kid,
      titleTh: 'ปุ่มคำสั่งนี้ถูกปิดใช้งานชั่วคราว',
      messageTh: 'พี่เลี้ยงหรือแอดมินได้ปิดการใช้งานปุ่มนี้ชั่วคราว',
      tone: 'yellow',
    };
  }

  if (!cmd.allowedKidIds.includes(kid.id)) {
    return {
      ok: false,
      updatedMember: kid,
      titleTh: 'ไม่มีสิทธิ์กดปุ่มคำสั่งนี้',
      messageTh: `${kid.nickname} ไม่อยู่ในรายชื่อผู้มีสิทธิ์ของปุ่ม "${cmd.titleTh}"`,
      tone: 'pink',
    };
  }

  const dp = kid.dailyProgress.dateStr === todayStr ? kid.dailyProgress : { dateStr: todayStr };
  const completedIds = dp.completedCommandIds || [];
  if (!isPenaltyCmd && completedIds.includes(cmd.id)) {
    return {
      ok: false,
      updatedMember: kid,
      titleTh: `${kid.nickname} กด "${cmd.titleTh}" ไปแล้ววันนี้`,
      messageTh: 'บันทึกคำสั่งวันนี้ไว้แล้ว ไม่สามารถกดซ้ำเพื่อรับดาวซ้ำได้จ้า',
      tone: 'blue',
    };
  }

  const availability = getDoorCommandAvailability(cmd, now, isHolidayToday);
  if (!availability.canOpen) {
    return {
      ok: false,
      updatedMember: kid,
      titleTh:
        availability.status === 'locked_after_deadline'
          ? `เลยเส้นตาย ${cmd.deadlineTime} น. แล้ว`
          : 'อยู่นอกเวลากดคำสั่ง',
      messageTh:
        availability.status === 'before_window'
          ? `ปุ่ม "${cmd.titleTh}" เปิดเวลา ${cmd.startTime}–${cmd.endTime} น. (กดก่อนได้ ${cmd.earlyMinutes} นาที · อีก ${availability.minutesUntilOpen} นาทีจะเปิด)`
          : availability.status === 'locked_after_deadline'
            ? `ปุ่ม "${cmd.titleTh}" กำหนดเส้นตายไม่เกิน ${cmd.deadlineTime} น. (${cmd.penaltyNoteTh || 'ล็อกปุ่มอัตโนมัติ'})`
            : `หมดเวลาสำหรับปุ่ม "${cmd.titleTh}" (${cmd.startTime}–${cmd.endTime} น.)`,
      tone: 'yellow',
    };
  }

  // Auth checks
  let verifiedByLabel = '';
  if (cmd.authMode === 'kid_pin') {
    const cleanPin = kidPinInput.trim();
    if (!/^\d{4}$/.test(cleanPin) || cleanPin !== kid.pin) {
      return {
        ok: false,
        updatedMember: kid,
        titleTh: 'รหัส PIN 4 หลักของน้องไม่ถูกต้อง',
        messageTh: `กรุณาใส่รหัส PIN 4 หลักของ ${kid.nickname} ให้ถูกต้องในช่องยืนยันปุ่มคำสั่ง`,
        tone: 'pink',
      };
    }
    verifiedByLabel = `${kid.nickname} ยืนยัน PIN`;
  } else if (cmd.authMode === 'staff_pin') {
    const cleanPin = staffPinInput.trim();
    const matchedStaff = staffMembers.find((s) => s.pin === cleanPin);
    const isCreatorPin = creatorPins.includes(cleanPin);
    if (!matchedStaff && !isCreatorPin) {
      return {
        ok: false,
        updatedMember: kid,
        titleTh: 'รหัส PIN พี่เลี้ยงไม่ถูกต้อง',
        messageTh: 'ปุ่มคำสั่งนี้ต้องให้พี่เลี้ยงใส่ PIN 4 หลักเพื่อยืนยัน',
        tone: 'pink',
      };
    }
    verifiedByLabel = matchedStaff ? `ยืนยันโดย ${matchedStaff.nickname}` : 'ยืนยันโดย Admin';
  }

  const customReason = penaltyReasonOverride.trim();
  const configuredCustomLabel =
    cmd.penaltyType === 'custom_task' ? cmd.customPenaltyLabelTh?.trim() || '' : '';
  const effectivePenaltyNote =
    configuredCustomLabel && customReason
      ? `${configuredCustomLabel} — ${customReason}`
      : customReason || configuredCustomLabel || cmd.penaltyNoteTh.trim() || cmd.titleTh;

  // Dedicated Penalty Command: immediately apply configured punishment
  if (isPenaltyCmd) {
    let fineThb = 0;
    let starsDeducted = 0;
    let freeDayPenaltyDelta = 0;
    let phoneBlockedReason: string | undefined;
    let phoneBlockedUntilDate: string | undefined;

    switch (cmd.penaltyType) {
      case 'fine_per_min':
      case 'fixed_fine':
        fineThb = Math.max(1, cmd.penaltyValue || 20);
        break;
      case 'deduct_stars':
        starsDeducted = Math.min(kid.stars, Math.max(1, cmd.penaltyValue || 10));
        break;
      case 'deduct_free_day':
        freeDayPenaltyDelta = Math.max(1, cmd.penaltyValue || 1);
        phoneBlockedReason = `${effectivePenaltyNote} (หัก Free Day ${freeDayPenaltyDelta} วัน)`;
        break;
      case 'block_phone_today':
        phoneBlockedReason = `${effectivePenaltyNote} (งดใช้มือถือวันนี้ถึง 18:30 น.)`;
        phoneBlockedUntilDate = todayStr;
        break;
      case 'block_phone_tomorrow':
        phoneBlockedReason = `${effectivePenaltyNote} (งดใช้มือถือวันพรุ่งนี้ 1 วัน)`;
        phoneBlockedUntilDate = addDaysToDateStr(todayStr, 1);
        break;
      case 'custom_task':
      case 'block':
      case 'none':
      default:
        break;
    }

    const nextPenalties = [
      {
        id: `cmdpen_${Date.now()}`,
        dateStr: todayStr,
        reason:
          phoneBlockedReason ||
          (fineThb > 0
            ? `${effectivePenaltyNote} (ปรับ ${fineThb} บาท)`
            : starsDeducted > 0
              ? `${effectivePenaltyNote} (หัก ${starsDeducted} ⭐)`
              : effectivePenaltyNote),
        fineThb,
        phoneRestrictedUntil: phoneBlockedReason,
        freeDayDeducted: freeDayPenaltyDelta || undefined,
        resolved: false,
      },
      ...kid.penalties,
    ];

    const nextHistory = [...kid.starHistory];
    if (starsDeducted > 0) {
      nextHistory.unshift({
        id: `cmdstar_pen_${Date.now()}`,
        timestamp: timeStr,
        dateStr: todayStr,
        amount: -starsDeducted,
        label: `บทลงโทษ: ${effectivePenaltyNote}${verifiedByLabel ? ` (${verifiedByLabel})` : ''}`,
        type: 'staff',
      });
    }

    const updatedMember: Member = {
      ...kid,
      stars: Math.max(0, kid.stars - starsDeducted),
      lateFineThb: kid.lateFineThb + fineThb,
      freeDayPenaltyCount: kid.freeDayPenaltyCount + freeDayPenaltyDelta,
      phoneBlockedReason: phoneBlockedReason || kid.phoneBlockedReason,
      dailyProgress: {
        ...dp,
        dateStr: todayStr,
        ...(phoneBlockedUntilDate ? { phoneBlockedUntilDate } : {}),
        completedCommandIds: [...completedIds, cmd.id],
      },
      penalties: nextPenalties,
      starHistory: nextHistory,
    };

    const summaryParts: string[] = [];
    if (fineThb > 0) summaryParts.push(`ปรับ ${fineThb} บาท`);
    if (starsDeducted > 0) summaryParts.push(`หัก ${starsDeducted} ⭐`);
    if (freeDayPenaltyDelta > 0) summaryParts.push(`หัก Free Day ${freeDayPenaltyDelta} วัน`);
    if (phoneBlockedUntilDate) summaryParts.push(phoneBlockedReason || 'งดใช้มือถือตามกำหนด');
    if (summaryParts.length === 0) summaryParts.push(effectivePenaltyNote);

    return {
      ok: true,
      updatedMember,
      titleTh: `${kid.nickname}: บันทึกบทลงโทษแล้ว ⚖️`,
      messageTh: `${summaryParts.join(' · ')}${verifiedByLabel ? ` · ${verifiedByLabel}` : ''}`,
      tone: 'pink',
    };
  }

  // Evaluate routine reward or late penalty
  const isExcused = Boolean(dp.isSickToday) || isHolidayToday;
  let starsAwarded = 0;
  let starsDeductedLate = 0;
  let fineThb = 0;
  let freeDayPenaltyDelta = 0;
  let phoneBlockedReason: string | undefined;
  let phoneBlockedUntilDate: string | undefined;
  let customTaskSummary: string | undefined;

  if (!availability.isLate || isExcused) {
    starsAwarded = Math.max(0, Math.round(cmd.rewardStars || 0));
  } else {
    const minsLate = Math.max(1, availability.minutesLate);
    switch (cmd.penaltyType) {
      case 'fine_per_min':
        fineThb = Math.min(50, minsLate * Math.max(1, cmd.penaltyValue || 5));
        break;
      case 'fixed_fine':
        fineThb = Math.max(1, cmd.penaltyValue || 10);
        break;
      case 'deduct_stars':
        starsDeductedLate = Math.min(kid.stars, Math.max(1, cmd.penaltyValue || 10));
        break;
      case 'deduct_free_day':
        freeDayPenaltyDelta = Math.max(1, cmd.penaltyValue || 1);
        phoneBlockedReason = `${cmd.titleTh} เกิน ${cmd.deadlineTime} น. (หัก Free Day ${freeDayPenaltyDelta} วัน)`;
        break;
      case 'block_phone_today':
        phoneBlockedReason = `${cmd.titleTh} เกิน ${cmd.deadlineTime} น. งดใช้มือถือถึง 18:30 น.`;
        phoneBlockedUntilDate = todayStr;
        break;
      case 'block_phone_tomorrow':
        phoneBlockedReason = `${cmd.titleTh} เกิน ${cmd.deadlineTime} น. งดใช้มือถือวันพรุ่งนี้ 1 วัน`;
        phoneBlockedUntilDate = addDaysToDateStr(todayStr, 1);
        break;
      case 'custom_task':
        customTaskSummary = `${cmd.titleTh} เกิน ${cmd.deadlineTime} น. (${configuredCustomLabel || effectivePenaltyNote})`;
        break;
      default:
        break;
    }
  }

  // Sync known dailyProgress flags so Staff Express stays aligned
  const progressPatch: Partial<Member['dailyProgress']> = {
    completedCommandIds: [...completedIds, cmd.id],
  };
  let extraCartoonUnlock: boolean | undefined;

  if (cmd.id === 'cmd_morning_phone' || cmd.id === 'cmd_school') {
    progressPatch.morningPhoneCheckedOut = true;
    if (kid.ageGroup === 1 && cmd.id === 'cmd_school') progressPatch.vanDone = true;
  } else if (cmd.id === 'cmd_breakfast') {
    progressPatch.breakfastDone = true;
  } else if (cmd.id === 'cmd_home') {
    progressPatch.homeCheckInDone = true;
    if (kid.ageGroup === 1 && !dp.speedyNinjaStartMs) {
      progressPatch.speedyNinjaStartMs = now.getTime();
    }
  } else if (cmd.id === 'cmd_evening_phone') {
    progressPatch.eveningChecklistDone = true;
    progressPatch.eveningPhoneUnlocked = true;
  } else if (cmd.id === 'cmd_cartoon') {
    progressPatch.bossStageDone = true;
    extraCartoonUnlock = true;
  } else if (cmd.id === 'cmd_homework') {
    progressPatch.homeworkRegisteredSubject = dp.homeworkRegisteredSubject || 'ทำการบ้าน (จากปุ่มหน้าประตู)';
  } else if (cmd.id === 'cmd_return_phone') {
    progressPatch.phoneReturnedDone = true;
  }

  const nextPenalties = [...kid.penalties];
  if (
    fineThb > 0 ||
    starsDeductedLate > 0 ||
    phoneBlockedReason ||
    freeDayPenaltyDelta > 0 ||
    customTaskSummary
  ) {
    nextPenalties.unshift({
      id: `cmdpen_${Date.now()}`,
      dateStr: todayStr,
      reason:
        phoneBlockedReason ||
        customTaskSummary ||
        `${cmd.titleTh} เกินเส้นตาย ${cmd.deadlineTime} น. (${availability.minutesLate} นาที)`,
      fineThb,
      phoneRestrictedUntil: phoneBlockedReason,
      freeDayDeducted: freeDayPenaltyDelta || undefined,
      resolved: false,
    });
  }

  const nextHistory = [...kid.starHistory];
  if (starsAwarded > 0) {
    nextHistory.unshift({
      id: `cmdstar_${Date.now()}`,
      timestamp: timeStr,
      dateStr: todayStr,
      amount: starsAwarded,
      label: `${cmd.titleTh}${verifiedByLabel ? ` (${verifiedByLabel})` : ''}`,
      type: 'earn',
    });
  } else if (starsDeductedLate > 0) {
    nextHistory.unshift({
      id: `cmdstar_late_${Date.now()}`,
      timestamp: timeStr,
      dateStr: todayStr,
      amount: -starsDeductedLate,
      label: `${cmd.titleTh} เกินเส้นตาย${verifiedByLabel ? ` (${verifiedByLabel})` : ''}`,
      type: 'staff',
    });
  }

  const updatedMember: Member = {
    ...kid,
    ...(extraCartoonUnlock ? { cartoonUnlockedToday: true } : {}),
    stars: Math.max(0, kid.stars + starsAwarded - starsDeductedLate),
    lateFineThb: kid.lateFineThb + fineThb,
    freeDayPenaltyCount: kid.freeDayPenaltyCount + freeDayPenaltyDelta,
    phoneBlockedReason: phoneBlockedReason || kid.phoneBlockedReason,
    dailyProgress: {
      ...dp,
      dateStr: todayStr,
      ...(phoneBlockedUntilDate ? { phoneBlockedUntilDate } : {}),
      ...progressPatch,
    },
    penalties: nextPenalties,
    starHistory: nextHistory,
  };

  if (!availability.isLate || isExcused) {
    return {
      ok: true,
      updatedMember,
      titleTh: `${kid.nickname}: ${cmd.titleTh} สำเร็จ!`,
      messageTh: `${
        starsAwarded > 0 ? `ได้รับ +${starsAwarded} ⭐ ` : 'บันทึกเวลาเรียบร้อย '
      }${availability.status === 'early_window' ? '(กดช่วงก่อนเวลา)' : '(ตรงเวลา)'}${
        verifiedByLabel ? ` · ${verifiedByLabel}` : ''
      }`,
      tone: 'mint',
    };
  }

  const penaltySummary =
    fineThb > 0
      ? `ค่าปรับ ${fineThb} บาท`
      : starsDeductedLate > 0
        ? `หัก ${starsDeductedLate} ⭐`
        : phoneBlockedReason ||
          customTaskSummary ||
          'ไม่ได้รับดาวรอบนี้เนื่องจากเกินเส้นตาย';

  return {
    ok: true,
    updatedMember,
    titleTh: `${kid.nickname}: บันทึกแล้ว (เลยเส้นตาย ${availability.minutesLate} นาที)`,
    messageTh: `${penaltySummary}${verifiedByLabel ? ` · ${verifiedByLabel}` : ''}`,
    tone: 'pink',
  };
}
