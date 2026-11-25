import { COVER_LOCATIONS } from '../data/seedData';
import { AgeGroup, BarnhemState, Gender, Language, Member, ShopItem, SickReport } from '../types/barnhem';

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return formatDateStr(new Date(y, m - 1, d + days));
}

export function formatTimeHMS(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export interface LaundryQueueInfo {
  dayOfMonth: number;
  target: 'boys' | 'girls' | 'everyone';
  labelTh: string;
  labelEn: string;
}

/**
 * Even day -> Boys, Odd day -> Girls, 31st -> Everyone
 */
export function getLaundryQueue(date: Date): LaundryQueueInfo {
  const day = date.getDate();
  if (day === 31) {
    return {
      dayOfMonth: day,
      target: 'everyone',
      labelTh: 'วันที่ 31: คิวซักผ้าทุกคน (ชาย & หญิง)',
      labelEn: '31st: Laundry Day for Everyone',
    };
  }
  if (day % 2 === 0) {
    return {
      dayOfMonth: day,
      target: 'boys',
      labelTh: `วันที่ ${day} (วันคู่): คิวซักผ้าผู้ชาย`,
      labelEn: `Day ${day} (Even): Boys' Laundry Queue`,
    };
  }
  return {
    dayOfMonth: day,
    target: 'girls',
    labelTh: `วันที่ ${day} (วันคี่): คิวซักผ้าผู้หญิง`,
    labelEn: `Day ${day} (Odd): Girls' Laundry Queue`,
  };
}

export function isMyLaundryDay(date: Date, gender: Gender): boolean {
  const q = getLaundryQueue(date);
  if (q.target === 'everyone') return true;
  if (q.target === 'boys') return gender === 'M';
  return gender === 'F';
}

export interface ActionEvaluation {
  starsAwarded: number;
  fineThb: number;
  phoneBlockedReason?: string;
  phoneBlockedUntilDate?: string;
  freeDayPenaltyDelta?: number;
  isLate: boolean;
  titleTh: string;
  messageTh: string;
  titleEn: string;
  messageEn: string;
  tone: 'mint' | 'pink' | 'yellow' | 'peach' | 'blue';
}

// ---------------- GROUP 1: PRIMARY (NO PHONE) ----------------

export function evaluateGroup1Breakfast(now: Date, isHolidayToday = false): ActionEvaluation {
  if (isHolidayToday) {
    return {
      starsAwarded: 5,
      fineThb: 0,
      isLate: false,
      titleTh: 'ทานข้าวเช้าวันหยุดสดใส! 🍚🏖️',
      messageTh: 'เปิดโหมดวันหยุด/ปิดเทอม — ไม่นับสายมื้อเช้า รับไปเลย +5 ดาว ⭐',
      titleEn: 'Holiday Breakfast! 🍚🏖️',
      messageEn: 'Holiday mode active — no morning cutoff, earned +5 stars ⭐',
      tone: 'mint',
    };
  }
  const mins = minutesOfDay(now);
  // Before 06:40 => < 400 mins
  if (mins < 6 * 60 + 40) {
    return {
      starsAwarded: 5,
      fineThb: 0,
      isLate: false,
      titleTh: 'ทานข้าวเช้าตรงเวลา! 🍚',
      messageTh: 'เก่งมากเลย! กินข้าวเช้าก่อน 06:40 น. รับไปเลย +5 ดาว ⭐',
      titleEn: 'Early Breakfast! 🍚',
      messageEn: 'Awesome! Breakfast before 06:40 AM earns +5 stars ⭐',
      tone: 'mint',
    };
  }
  return {
    starsAwarded: 0,
    fineThb: 0,
    isLate: true,
    titleTh: 'อุ๊ย! เลย 06:40 น. แล้วนะจ๊ะ 😜',
    messageTh: 'สายมื้อเช้าไปนิดนึง วันนี้ไม่ได้ดาวนะจ๊ะ ระวังค่าขนมปลิวด้วยน้า รีบกินให้ไวเลย!',
    titleEn: 'Oops, past 06:40 AM! 😜',
    messageEn: 'A bit late for breakfast — no stars this round, watch your snack allowance!',
    tone: 'yellow',
  };
}

export function evaluateGroup1Van(now: Date, isHolidayToday = false): ActionEvaluation {
  if (isHolidayToday) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'เช็คอินเช้าวันหยุด / ปิดเทอม! 🏖️',
      messageTh: 'วันนี้ไม่มีรถตู้โรงเรียน ยกเว้นเวลาสายให้และรับ +10 ดาว ⭐ พักผ่อนให้เต็มที่นะ!',
      titleEn: 'Holiday Morning Check-in! 🏖️',
      messageEn: 'No school van today — tardiness waived and earned +10 stars ⭐',
      tone: 'mint',
    };
  }
  const mins = minutesOfDay(now);
  // Not exceeding 07:01 => <= 421 mins
  if (mins <= 7 * 60 + 1) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'ขึ้นรถตู้ทันเวลา! 🚐',
      messageTh: 'ยอดเยี่ยม! ขึ้นรถตู้ไม่เกิน 07:01 น. รับไปเลย +10 ดาว ⭐',
      titleEn: 'On the Van on Time! 🚐',
      messageEn: 'Great job! Boarded by 07:01 AM — earned +10 stars ⭐',
      tone: 'mint',
    };
  }
  return {
    starsAwarded: 0,
    fineThb: 0,
    isLate: true,
    titleTh: 'ขึ้นรถตู้สายแล้ว (ตั้งแต่ 07:02 น.) ⏰',
    messageTh: 'วันนี้ขึ้นรถช้ากว่า 07:01 น. เลยไม่ได้รับดาวนะ พรุ่งนี้ตื่นไวขึ้นอีกนิดสู้ๆ!',
    titleEn: 'Late for School Van (07:02+) ⏰',
    messageEn: 'Boarded after 07:01 AM — no stars earned today. Try earlier tomorrow!',
    tone: 'peach',
  };
}

export function evaluateGroup1ExtraStudy(now: Date): ActionEvaluation {
  const mins = minutesOfDay(now);
  if (mins <= 16 * 60 + 50) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'เข้าด่านเรียนเสริมทันเวลา! 📚',
      messageTh: 'ตั้งใจเรียนสุดๆ เช็คอินก่อน 16:50 น. รับ +10 ดาว ⭐',
      titleEn: 'Extra Study On Time! 📚',
      messageEn: 'Checked in by 16:50 — earned +10 stars ⭐',
      tone: 'mint',
    };
  }
  return {
    starsAwarded: 0,
    fineThb: 0,
    isLate: true,
    titleTh: 'เข้าเรียนเสริมช้ากว่า 16:50 น.',
    messageTh: 'บันทึกการเข้าเรียนเรียบร้อยแล้ว แต่รอบนี้เกินเวลา 16:50 น. จึงไม่ได้รับดาวนะ',
    titleEn: 'Extra Study Past 16:50',
    messageEn: 'Checked in after 16:50 — recorded without star bonus.',
    tone: 'yellow',
  };
}

export function evaluateGroup1Housework(now: Date): ActionEvaluation {
  const mins = minutesOfDay(now);
  if (mins < 18 * 60 + 15) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'เวลาทองคำ! งานบ้านเสร็จไวมาก ✨',
      messageTh: 'ตากชุดนักเรียนและทำงานบ้านเสร็จก่อน 18:15 น. รับ +10 ดาว ⭐',
      titleEn: 'Golden Time Chores! ✨',
      messageEn: 'Finished housework & hung uniform before 18:15 — +10 stars ⭐',
      tone: 'mint',
    };
  }
  if (mins <= 18 * 60 + 50) {
    return {
      starsAwarded: 3,
      fineThb: 0,
      isLate: false,
      titleTh: 'ทำงานบ้านเสร็จแล้ว 🧹',
      messageTh: 'เสร็จก่อน 18:50 น. รับไป +3 ดาว ⭐ รีบไปเตรียมตัวต่อนะ',
      titleEn: 'Housework Complete 🧹',
      messageEn: 'Finished before 18:50 — +3 stars ⭐',
      tone: 'blue',
    };
  }
  return {
    starsAwarded: 0,
    fineThb: 0,
    isLate: true,
    titleTh: 'หมดเวลาวิ่งเล่นแล้ว! (เกิน 18:50 น.) 🌙',
    messageTh: 'เกินเวลา 18:50 น. แล้ว หมดเวลาวิ่งเล่นนะจ๊ะ รีบเคลียร์งานให้เรียบร้อย',
    titleEn: 'Playtime Over! (Past 18:50) 🌙',
    messageEn: 'Past 18:50 — playtime is over, no star bonus this round.',
    tone: 'peach',
  };
}

export function getGroup1DailyBossSubject(date: Date): { th: string; en: string } {
  const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  switch (day) {
    case 1:
      return { th: 'วันจันทร์: เรียนภาษาญี่ปุ่น 🇯🇵', en: 'Monday: Japanese Class 🇯🇵' };
    case 2:
      return { th: 'วันอังคาร: เรียนภาษาอังกฤษ 🇬🇧', en: 'Tuesday: English Class 🇬🇧' };
    case 3:
      return { th: 'วันพุธ: เรียนภาษาจีน 🇨🇳', en: 'Wednesday: Chinese Class 🇨🇳' };
    case 4:
      return { th: 'วันพฤหัสบดี: เรียนภาษาอังกฤษ 🇬🇧', en: 'Thursday: English Class 🇬🇧' };
    default:
      return { th: 'กิจกรรมทบทวนและฝึกสมาธิ 20:00 น. 🌟', en: 'Evening Review & Activity 20:00 🌟' };
  }
}

// ---------------- GROUP 2: HIGH SCHOOL (PERSONAL PHONE) ----------------

export function evaluateGroup2Morning(
  now: Date,
  isSickToday: boolean,
  isHolidayToday = false
): ActionEvaluation {
  const day = now.getDay(); // 0=Sun, 6=Sat
  const mins = minutesOfDay(now);
  const todayStr = formatDateStr(now);

  if (isHolidayToday && day >= 1 && day <= 5) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'เช็คอินเช้าวันหยุด / ปิดเทอม 🏖️',
      messageTh: 'เปิดโหมดวันหยุด/ปิดเทอม — ยกเว้นค่าปรับสาย 0 บาทอัตโนมัติ รับ +10 ดาว ⭐',
      titleEn: 'Holiday Mode Morning Check-in 🏖️',
      messageEn: 'School break/holiday mode active — late fine waived (+10 stars ⭐).',
      tone: 'mint',
    };
  }

  // Saturday (Free Day)
  if (day === 6) {
    if (mins >= 8 * 60 && mins <= 8 * 60 + 30) {
      return {
        starsAwarded: 10,
        fineThb: 0,
        isLate: false,
        titleTh: 'เช็คอินเช้าวันเสาร์ (Free Day) ☀️',
        messageTh: 'ตรงเวลา 08:00–08:30 น. รับ +10 ดาว ⭐ ทำเวร อาบน้ำ เช็คเวรครัวให้เรียบร้อยนะ!',
        titleEn: 'Saturday Free Day Check-in ☀️',
        messageEn: 'On time (08:00–08:30) — +10 stars ⭐',
        tone: 'mint',
      };
    }
    if (mins > 8 * 60 + 30 && mins <= 8 * 60 + 45) {
      return {
        starsAwarded: 0,
        fineThb: 0,
        isLate: true,
        titleTh: 'เตือน! เริ่มสายแล้วนะ (08:31–08:45 น.) ⚠️',
        messageTh: 'รีบเช็คอินทำเวร อาบน้ำ และเช็คเวรครัวด่วน! ถ้าเกิน 08:45 น. จะถูกยึดมือถือถึง 18:30 น.',
        titleEn: 'Warning: Getting Late (08:31–08:45) ⚠️',
        messageEn: 'Hurry! Past 08:45 triggers phone lock until 18:30.',
        tone: 'yellow',
      };
    }
    if (mins > 8 * 60 + 45) {
      if (isSickToday) {
        return {
          starsAwarded: 0,
          fineThb: 0,
          isLate: false,
          titleTh: 'ยกเว้นโทษเนื่องจากแจ้งป่วยวันนี้ 💚',
          messageTh: 'พักผ่อนให้เต็มที่นะ ระบบยกเว้นโทษสายให้โดยอัตโนมัติ',
          titleEn: 'Excused Due to Sick Report 💚',
          messageEn: 'Rest well — late penalty waived automatically.',
          tone: 'mint',
        };
      }
      return {
        starsAwarded: 0,
        fineThb: 0,
        phoneBlockedReason: 'สายเช้าวันเสาร์ (เกิน 08:45 น.) งดใช้มือถือถึง 18:30 น.',
        phoneBlockedUntilDate: todayStr,
        isLate: true,
        titleTh: 'บันทึกโทษยึดมือถือถึง 18:30 น.! 📱🔒',
        messageTh: 'เช็คอินวันเสาร์เกิน 08:45 น. ระบบบันทึกงดใช้มือถือยาวถึง 18:30 น. (ทำเวร+อาบน้ำ+เช็คเวรครัว)',
        titleEn: 'Phone Locked Until 18:30! 📱🔒',
        messageEn: 'Checked in after 08:45 on Saturday — phone locked until 18:30.',
        tone: 'pink',
      };
    }
    // Before 08:00 on Saturday
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'ตื่นเช้าวันเสาร์เก่งมาก! ☀️',
      messageTh: 'เช็คอินก่อน/ช่วงเช้าวันเสาร์ รับ +10 ดาว ⭐',
      titleEn: 'Early Saturday Check-in! ☀️',
      messageEn: 'Great start on Saturday — +10 stars ⭐',
      tone: 'mint',
    };
  }

  // Sunday
  if (day === 0) {
    if (mins <= 8 * 60 + 15) {
      return {
        starsAwarded: 15,
        fineThb: 0,
        isLate: false,
        titleTh: 'เช็คอินเช้าวันอาทิตย์ตรงเวลา! 🌟',
        messageTh: 'เช็คอิน 08:00–08:15 น. รับ +15 ดาว ⭐ ทำเวร+อาบน้ำ+เช็คเวรครัว (รับมือถือได้ตั้งแต่ 08:00 น.)',
        titleEn: 'Sunday Morning On Time! 🌟',
        messageEn: 'Checked in by 08:15 — +15 stars ⭐',
        tone: 'mint',
      };
    }
    if (mins <= 8 * 60 + 20) {
      return {
        starsAwarded: 0,
        fineThb: 0,
        isLate: true,
        titleTh: 'เกือบไม่ทันแล้ว! (08:16–08:20 น.) ⚠️',
        messageTh: 'รีบทำเวร+อาบน้ำ+เช็คเวรครัวทันที เกิน 08:20 น. ยึดมือถือถึง 18:30 น. นะ!',
        titleEn: 'Warning: 08:16–08:20 ⚠️',
        messageEn: 'Past 08:20 locks phone until 18:30!',
        tone: 'yellow',
      };
    }
    if (isSickToday) {
      return {
        starsAwarded: 0,
        fineThb: 0,
        isLate: false,
        titleTh: 'ยกเว้นโทษเนื่องจากแจ้งป่วยวันนี้ 💚',
        messageTh: 'พักผ่อนรักษาสุขภาพนะ ระบบยกเว้นโทษสายให้อัตโนมัติ',
        titleEn: 'Excused Due to Sick Report 💚',
        messageEn: 'Rest well — penalty waived automatically.',
        tone: 'mint',
      };
    }
    return {
      starsAwarded: 0,
      fineThb: 0,
      phoneBlockedReason: 'สายเช้าวันอาทิตย์ (เกิน 08:20 น.) งดใช้มือถือถึง 18:30 น.',
      phoneBlockedUntilDate: todayStr,
      isLate: true,
      titleTh: 'บันทึกโทษยึดมือถือถึง 18:30 น.! 📱🔒',
      messageTh: 'เช็คอินวันอาทิตย์เกิน 08:20 น. งดใช้มือถือยาวถึง 18:30 น.',
      titleEn: 'Phone Locked Until 18:30! 📱🔒',
      messageEn: 'Sunday check-in past 08:20 — phone locked until 18:30.',
      tone: 'pink',
    };
  }

  // Weekday (Mon-Fri)
  if (mins <= 7 * 60 + 21) {
    return {
      starsAwarded: 10,
      fineThb: 0,
      isLate: false,
      titleTh: 'ไปโรงเรียนตรงเวลา! (ไม่เกิน 07:21 น.) 🎒',
      messageTh: 'อาบน้ำ แต่งตัว กินข้าวเรียบร้อย รับมือถือรอบเช้าและ +10 ดาว ⭐ ขอให้สนุกกับการเรียนนะ!',
      titleEn: 'School Morning On Time! (<= 07:21) 🎒',
      messageEn: 'All ready! Phone checked out and earned +10 stars ⭐',
      tone: 'mint',
    };
  }

  // >= 07:22
  if (isSickToday) {
    return {
      starsAwarded: 0,
      fineThb: 0,
      isLate: false,
      titleTh: 'ยกเว้นค่าปรับสาย (แจ้งป่วยวันนี้) 💚',
      messageTh: 'วันนี้มีการแจ้งเจ็บป่วยไว้ ระบบยกเว้นค่าปรับสายให้ 0 บาทโดยอัตโนมัติ หายไวๆ นะ!',
      titleEn: 'Late Fine Waived (Sick Today) 💚',
      messageEn: 'You reported sick today — late fine is automatically waived (0 THB).',
      tone: 'mint',
    };
  }

  const minsLate = mins - (7 * 60 + 21); // 07:22 => 1 min late = 5 THB
  const fine = Math.min(50, minsLate * 5);
  return {
    starsAwarded: 0,
    fineThb: fine,
    isLate: true,
    titleTh: `มาสาย ${minsLate} นาที — ค่าปรับ ${fine} บาท ⚖️`,
    messageTh: `เลยเวลา 07:21 น. มา ${minsLate} นาที คำนวณค่าปรับนาทีละ 5 บาท (สูงสุด 50 บาท) = ${fine} บาท`,
    titleEn: `Late by ${minsLate} min — Fine ${fine} THB ⚖️`,
    messageEn: `Past 07:21 AM by ${minsLate} min. Automatic fine (5 THB/min, max 50 THB) = ${fine} THB.`,
    tone: 'pink',
  };
}

export function evaluateGroup2PhoneReturn(now: Date, hasHomeworkRegistered: boolean): ActionEvaluation {
  const day = now.getDay(); // 0 = Sun, 5 = Fri
  const mins = minutesOfDay(now);

  // Sunday or no homework => deadline 21:00 (21*60 = 1260)
  const use2245 = hasHomeworkRegistered && day !== 0;
  const deadlineMins = use2245 ? 22 * 60 + 45 : 21 * 60;

  if (mins <= deadlineMins) {
    return {
      starsAwarded: 5,
      fineThb: 0,
      isLate: false,
      titleTh: 'ส่งคืนมือถือตรงเวลา! 🌙✨',
      messageTh: `ส่งคืนก่อน ${use2245 ? '22:45' : '21:00'} น. เยี่ยมมาก! รับ +5 ดาว ⭐ ฝันดีนะ`,
      titleEn: 'Phone Returned on Time! 🌙✨',
      messageEn: `Returned by ${use2245 ? '22:45' : '21:00'} — +5 stars ⭐ Good night!`,
      tone: 'mint',
    };
  }

  if (!use2245) {
    return {
      starsAwarded: 0,
      fineThb: 0,
      freeDayPenaltyDelta: 1,
      phoneBlockedReason: 'คืนมือถือเกิน 21:00 น. (หักสิทธิ์ Free Day วันศุกร์ 1 วัน)',
      isLate: true,
      titleTh: 'คืนมือถือเกิน 21:00 น.! ⛔',
      messageTh: 'บันทึกโทษอัตโนมัติ: หักสิทธิ์ Free Day วันศุกร์ 1 วัน!',
      titleEn: 'Returned After 21:00! ⛔',
      messageEn: 'Automatic penalty recorded: Deducted 1 Friday Free Day privilege.',
      tone: 'pink',
    };
  }

  return {
    starsAwarded: 0,
    fineThb: 0,
    phoneBlockedReason: 'คืนมือถือการบ้านเกิน 22:45 น. (งดใช้มือถือรอบเย็น 18:30 น. วันพรุ่งนี้ 1 วัน)',
    phoneBlockedUntilDate: addDaysToDateStr(formatDateStr(now), 1),
    isLate: true,
    titleTh: 'คืนมือถือเกิน 22:45 น.! ⛔',
    messageTh: 'บันทึกโทษอัตโนมัติ: งดใช้มือถือรอบเย็น 18:30 น. วันพรุ่งนี้ 1 วัน (ปลดล็อกอัตโนมัติเมื่อครบกำหนด)',
    titleEn: 'Returned After 22:45! ⛔',
    messageEn: 'Automatic penalty: Tomorrow 18:30 evening phone session suspended for 1 day.',
    tone: 'pink',
  };
}

// ---------------- GROUP 3: COLLEGE / INTERNSHIP ----------------

export function evaluateGroup3Morning(): ActionEvaluation {
  return {
    starsAwarded: 10,
    fineThb: 0,
    isLate: false,
    titleTh: 'เช็คอินไปฝึกงาน / เรียนสำเร็จ! 🎓',
    messageTh: 'บันทึกเวลาไปเรียน/ฝึกงานเรียบร้อย (ไม่มีหักสายตอนเช้า) รับ +10 ดาว ⭐ สู้ๆ นะ!',
    titleEn: 'College / Internship Check-in! 🎓',
    messageEn: 'Morning check-in recorded (+10 stars ⭐, no morning fine). Have a great day!',
    tone: 'mint',
  };
}

export function evaluateGroup3Evening(): ActionEvaluation {
  return {
    starsAwarded: 20,
    fineThb: 0,
    isLate: false,
    titleTh: 'กลับบ้านและเก็บมือถือเข้าตู้แล้ว! 🏡',
    messageTh: 'ยอดเยี่ยม! เก็บมือถือเข้าตู้เพื่อทำภารกิจส่วนตัว รับทันที +20 ดาว ⭐',
    titleEn: 'Returned & Stored Phone! 🏡',
    messageEn: 'Awesome! Phone stored in cabinet for personal tasks (+20 stars ⭐).',
    tone: 'mint',
  };
}

export function evaluateGroup3NightReturn(now: Date): ActionEvaluation {
  const mins = minutesOfDay(now);
  if (mins <= 22 * 60 + 45) {
    return {
      starsAwarded: 5,
      fineThb: 0,
      isLate: false,
      titleTh: 'ส่งคืนมือถือเข้าตู้ทัน Curfew 22:45 น.! 🌙',
      messageTh: 'ตรงเวลามาก พักผ่อนให้เพียงพอนะ รับ +5 ดาว ⭐',
      titleEn: 'Returned Before 22:45 Curfew! 🌙',
      messageEn: 'Right on time before 22:45 curfew! +5 stars ⭐',
      tone: 'mint',
    };
  }
  return {
    starsAwarded: 0,
    fineThb: 0,
    phoneBlockedReason: 'คืนมือถือเกิน Curfew 22:45 น. (งดใช้มือถือช่วงเย็นหลังกลับจากฝึกงานวันพรุ่งนี้ 1 วัน)',
    phoneBlockedUntilDate: addDaysToDateStr(formatDateStr(now), 1),
    isLate: true,
    titleTh: 'คืนมือถือเกินเวลา Curfew 22:45 น.! ⛔',
    messageTh: 'บันทึกโทษทันที: งดใช้มือถือช่วงเย็นหลังกลับจากฝึกงานวันพรุ่งนี้ 1 วัน (ปลดล็อกอัตโนมัติเมื่อครบกำหนด)',
    titleEn: 'Past 22:45 Curfew! ⛔',
    messageEn: 'Penalty recorded: Evening phone privilege suspended tomorrow for 1 day.',
    tone: 'pink',
  };
}

// ---------------- COVER LOCATION & SHOP LOGIC ----------------

export function getLocationItemsProgress(member: Member, locationIndex: number): {
  collected: number;
  required: number;
  isComplete: boolean;
} {
  const loc = COVER_LOCATIONS[locationIndex];
  if (!loc) return { collected: 0, required: 7, isComplete: false };
  const ownedSet = new Set([...member.ownedShopItemIds, ...member.collectedLocationItemIds]);
  const collected = loc.requiredItemIds.filter((id) => ownedSet.has(id)).length;
  return {
    collected,
    required: loc.requiredItemIds.length,
    isComplete: collected >= loc.requiredItemIds.length,
  };
}

export function canUnlockNextLocation(member: Member, nextLocationIndex: number): {
  allowed: boolean;
  reasonTh: string;
  reasonEn: string;
} {
  if (nextLocationIndex === 0) {
    return { allowed: true, reasonTh: 'เปิดใช้งานแล้ว', reasonEn: 'Unlocked' };
  }
  const targetLoc = COVER_LOCATIONS[nextLocationIndex];
  if (!targetLoc) {
    return { allowed: false, reasonTh: 'ไม่พบสถานที่', reasonEn: 'Location not found' };
  }
  if (member.stars < targetLoc.minStars) {
    return {
      allowed: false,
      reasonTh: `ต้องมีดาวสะสมอย่างน้อย ${targetLoc.minStars.toLocaleString()} ⭐`,
      reasonEn: `Requires at least ${targetLoc.minStars.toLocaleString()} ⭐`,
    };
  }
  const prevProgress = getLocationItemsProgress(member, nextLocationIndex - 1);
  // Require 7 items for locations that have item sets configured (0,1,2) OR at least 7 total decor/location items for higher tiers
  if (nextLocationIndex <= 3 && !prevProgress.isComplete) {
    return {
      allowed: false,
      reasonTh: `ต้องสะสมไอเทมสถานที่ก่อนหน้าให้ครบ ${prevProgress.required} ชิ้น (${prevProgress.collected}/${prevProgress.required})`,
      reasonEn: `Collect all ${prevProgress.required} items in previous location (${prevProgress.collected}/${prevProgress.required})`,
    };
  }
  return { allowed: true, reasonTh: 'ปลดล็อกได้!', reasonEn: 'Ready to unlock!' };
}

export function purchaseShopItem(
  member: Member,
  item: ShopItem,
  now: Date
): { ok: boolean; updatedMember: Member; errorTh?: string; errorEn?: string } {
  if (member.stars < item.priceStars) {
    return {
      ok: false,
      updatedMember: member,
      errorTh: `ดาวไม่พอ! ต้องการ ${item.priceStars} ⭐ แต่มี ${member.stars} ⭐`,
      errorEn: `Not enough stars! Needs ${item.priceStars} ⭐ (you have ${member.stars} ⭐)`,
    };
  }
  if (item.category === 'decor' && member.ownedShopItemIds.includes(item.id)) {
    return {
      ok: false,
      updatedMember: member,
      errorTh: 'มีไอเทมชิ้นนี้อยู่ในตู้แต่งตัวแล้วจ้า',
      errorEn: 'You already own this cover/wardrobe item!',
    };
  }

  const dateStr = formatDateStr(now);
  const timeStr = formatTimeHMS(now);

  const nextOwned =
    item.category === 'decor' ? [...member.ownedShopItemIds, item.id] : member.ownedShopItemIds;
  const nextCollectedLoc =
    item.decorSlot === 'location_item' && !member.collectedLocationItemIds.includes(item.id)
      ? [...member.collectedLocationItemIds, item.id]
      : member.collectedLocationItemIds;

  const nextOutfit = item.decorSlot === 'outfit' ? item.id : member.equippedOutfitId;
  const nextAccessories =
    item.decorSlot === 'accessory' && !member.equippedAccessoryIds.includes(item.id)
      ? [...member.equippedAccessoryIds, item.id]
      : member.equippedAccessoryIds;

  const updatedMember: Member = {
    ...member,
    stars: member.stars - item.priceStars,
    ownedShopItemIds: nextOwned,
    collectedLocationItemIds: nextCollectedLoc,
    equippedOutfitId: nextOutfit,
    equippedAccessoryIds: nextAccessories,
    starHistory: [
      {
        id: `spend_${Date.now()}`,
        timestamp: timeStr,
        dateStr,
        amount: -item.priceStars,
        label: `แลกซื้อ: ${item.name}`,
        type: 'spend',
      },
      ...member.starHistory,
    ],
  };

  return { ok: true, updatedMember };
}

export function getGroupLabel(ageGroup: AgeGroup | undefined, lang: Language): string {
  if (ageGroup === 1) return lang === 'th' ? 'กลุ่ม 1 · น้องเล็ก (ประถม)' : 'Group 1 · Primary';
  if (ageGroup === 2) return lang === 'th' ? 'กลุ่ม 2 · พี่โต (มัธยม)' : 'Group 2 · High School';
  return lang === 'th' ? 'กลุ่ม 3 · พี่ใหญ่ (วิทยาลัย)' : 'Group 3 · College/Intern';
}

export function getMemberDailySafe(member: Member, todayStr: string): Member {
  if (member.dailyProgress.dateStr === todayStr) return member;

  const prevBlockedUntil = member.dailyProgress.phoneBlockedUntilDate;
  const stillWithinTimedBlock = Boolean(
    member.phoneBlockedReason && prevBlockedUntil && todayStr <= prevBlockedUntil
  );
  const wasTimedBlockExpired = Boolean(
    member.phoneBlockedReason &&
      ((prevBlockedUntil && todayStr > prevBlockedUntil) ||
        (!prevBlockedUntil && member.phoneBlockedReason.includes('ถึง 18:30 น.')))
  );

  return {
    ...member,
    phoneBlockedReason: wasTimedBlockExpired ? undefined : member.phoneBlockedReason,
    penalties: wasTimedBlockExpired
      ? member.penalties.map((p) =>
          p.reason === member.phoneBlockedReason ? { ...p, resolved: true } : p
        )
      : member.penalties,
    dailyProgress: {
      dateStr: todayStr,
      ...(stillWithinTimedBlock && prevBlockedUntil ? { phoneBlockedUntilDate: prevBlockedUntil } : {}),
    },
    cartoonUnlockedToday: false,
  };
}

export interface KidPeriodicSummary {
  kid: Member;
  earnedStars7d: number;
  earnedStarsMonth: number;
  spentStarsMonth: number;
  sickDaysMonth: number;
  freeDayEligible: boolean;
}

export interface WeeklyMonthlySummary {
  weekStartStr: string;
  monthPrefix: string;
  monthLabel: string;
  freeDayEligibleCount: number;
  freeDayDeductedCount: number;
  totalEarned7d: number;
  totalEarnedMonth: number;
  totalLateFinesThb: number;
  rows: KidPeriodicSummary[];
  monthlyTopEarners: KidPeriodicSummary[];
}

export function buildWeeklyMonthlySummary(
  kids: Member[],
  sickReports: SickReport[],
  now: Date,
  lang: Language = 'th'
): WeeklyMonthlySummary {
  const todayStr = formatDateStr(now);
  const weekStartStr = addDaysToDateStr(todayStr, -6);
  const monthPrefix = todayStr.slice(0, 7);
  const monthLabel = now.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const rows: KidPeriodicSummary[] = kids.map((kid) => {
    let earnedStars7d = 0;
    let earnedStarsMonth = 0;
    let spentStarsMonth = 0;

    for (const tx of kid.starHistory) {
      if (tx.amount > 0 && tx.dateStr >= weekStartStr && tx.dateStr <= todayStr) {
        earnedStars7d += tx.amount;
      }
      if (tx.dateStr.startsWith(monthPrefix)) {
        if (tx.amount > 0) earnedStarsMonth += tx.amount;
        else if (tx.amount < 0) spentStarsMonth += Math.abs(tx.amount);
      }
    }

    const sickDaysMonth = sickReports.filter(
      (r) => r.kidId === kid.id && r.dateStr.startsWith(monthPrefix)
    ).length;

    return {
      kid,
      earnedStars7d,
      earnedStarsMonth,
      spentStarsMonth,
      sickDaysMonth,
      freeDayEligible: kid.freeDayPenaltyCount === 0,
    };
  });

  const monthlyTopEarners = [...rows]
    .sort((a, b) => b.earnedStarsMonth - a.earnedStarsMonth || b.kid.stars - a.kid.stars)
    .slice(0, 5);

  return {
    weekStartStr,
    monthPrefix,
    monthLabel,
    freeDayEligibleCount: rows.filter((r) => r.freeDayEligible).length,
    freeDayDeductedCount: rows.filter((r) => !r.freeDayEligible).length,
    totalEarned7d: rows.reduce((sum, r) => sum + r.earnedStars7d, 0),
    totalEarnedMonth: rows.reduce((sum, r) => sum + r.earnedStarsMonth, 0),
    totalLateFinesThb: kids.reduce((sum, k) => sum + k.lateFineThb, 0),
    rows,
    monthlyTopEarners,
  };
}

export function buildMemberQrPayload(member: Pick<Member, 'id' | 'pin'>): string {
  return `BARNHEM:${member.id}:${member.pin}`;
}

export type UnifiedLoginResult =
  | { type: 'creator'; pin: string }
  | { type: 'manager'; member: Member }
  | { type: 'staff'; member: Member }
  | { type: 'kid_blocked'; member: Member }
  | { type: 'not_found' };

/**
 * Resolves a single PIN / ID / QR code payload into the exact target role & member.
 * Back-office login (Creator, Manager, Staff) is reserved strictly for Staff & Admins.
 * Kids participate only on the front page via the Daily Door Command Buttons.
 */
export function resolveUnifiedLogin(
  rawInput: string,
  members: Member[],
  creatorPins: string[]
): UnifiedLoginResult {
  const trimmed = rawInput.trim();
  if (!trimmed) return { type: 'not_found' };

  let idCandidate = '';
  let pinCandidate = '';

  if (trimmed.toUpperCase().startsWith('BARNHEM:')) {
    const parts = trimmed.split(':');
    idCandidate = (parts[1] || '').trim();
    pinCandidate = (parts[2] || '').trim();
  } else if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { id?: string; pin?: string };
      idCandidate = (parsed.id || '').trim();
      pinCandidate = (parsed.pin || '').trim();
    } catch {
      // Fall back to direct string matching
    }
  }

  // Check creator PIN first
  if (
    creatorPins.includes(trimmed) ||
    (idCandidate.toLowerCase() === 'creator' && creatorPins.includes(pinCandidate))
  ) {
    return { type: 'creator', pin: pinCandidate || trimmed };
  }

  // Match by QR payload (id + pin): staff & managers only; kid profiles are disabled
  if (idCandidate && pinCandidate) {
    const matched = members.find(
      (m) => m.id.toLowerCase() === idCandidate.toLowerCase() && m.pin === pinCandidate
    );
    if (matched) {
      if (matched.role === 'kid') {
        return { type: 'kid_blocked', member: matched };
      }
      return { type: matched.role, member: matched };
    }
  }

  // Match by 4-digit PIN: allowed ONLY for staff/manager (kid PIN is blocked at login gate)
  const byPin = members.find((m) => m.pin === trimmed);
  if (byPin) {
    if (byPin.role === 'kid') {
      return { type: 'kid_blocked', member: byPin };
    }
    return { type: byPin.role, member: byPin };
  }

  // Match kid by exact ID (e.g. j1, s1): child profile page removed, block back-office sign-in
  const byKidId = members.find(
    (m) => m.role === 'kid' && m.id.toLowerCase() === trimmed.toLowerCase()
  );
  if (byKidId) {
    return { type: 'kid_blocked', member: byKidId };
  }

  return { type: 'not_found' };
}

export async function syncToGoogleSheets(state: BarnhemState, actionName: string): Promise<void> {
  const url = state.settings.googleSheetsUrl?.trim();
  if (!url || typeof fetch === 'undefined') return;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: actionName,
        timestamp: new Date().toISOString(),
        totalMembers: state.members.length,
        sickReportsCount: state.sickReports.filter((r) => !r.resolved).length,
        snackBillsCount: state.snackBills.length,
        state,
      }),
    });
  } catch {
    // Offline or sandboxed CORS failure should never crash user interaction
  }
}
