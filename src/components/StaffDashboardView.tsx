import React, { useState } from 'react';
import { Cloud, Plus, RotateCcw, Star, Sun, X } from 'lucide-react';
import { UI_TEXT } from '../data/seedData';
import { DoorCommandsManagerSection } from './DoorCommandsManagerSection';
import { CloudSyncState } from './MagicDoorView';
import { PeriodicSummarySection } from './PeriodicSummarySection';
import {
  AgeGroup,
  AlertModalPayload,
  DoorCommandConfig,
  Gender,
  Language,
  Member,
  SickReport,
  SnackBill,
} from '../types/barnhem';
import { formatDateStr, formatTimeHMS } from '../utils/rules';
import {
  getStaffRemainingDailyStars,
  getStaffStarsGivenToday,
  STAFF_MAX_STARS_PER_DAY,
  STAFF_MAX_STARS_PER_GRANT,
} from '../utils/staffStars';

interface StaffDashboardViewProps {
  lang: Language;
  now: Date;
  loggedInStaff: Member | null;
  staffMembers: Member[];
  kids: Member[];
  sickReports: SickReport[];
  snackBills: SnackBill[];
  doorCommands: DoorCommandConfig[];
  isHolidayToday?: boolean;
  cloudSyncStatus?: CloudSyncState;
  onToggleHolidayToday?: () => void;
  onConnectCloud?: () => void;
  onLogin: (staff: Member) => void;
  onLogout: () => void;
  onResolveSick: (reportId: string, kidId: string) => void;
  onGrantStarsByStaff: (kid: Member, amount: number, reason: string) => { ok: boolean };
  onSaveDoorCommands: (commands: DoorCommandConfig[], actionName: string) => void;
  onResetAllDailyCommands?: () => void;
  onAddKid: (newKid: Member) => void;
  onFulfillBill: (billId: string) => void;
  onShowAlert: (payload: Omit<AlertModalPayload, 'id'>) => void;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  lang,
  now,
  loggedInStaff,
  staffMembers,
  kids,
  sickReports,
  snackBills,
  doorCommands,
  isHolidayToday = false,
  cloudSyncStatus = 'local',
  onToggleHolidayToday,
  onConnectCloud,
  onLogin,
  onLogout,
  onResolveSick,
  onGrantStarsByStaff,
  onSaveDoorCommands,
  onResetAllDailyCommands,
  onAddKid,
  onFulfillBill,
  onShowAlert,
}) => {
  const t = UI_TEXT[lang];
  const [pinInput, setPinInput] = useState('');

  // Add child form state
  const [newId, setNewId] = useState('');
  const [newNick, setNewNick] = useState('');
  const [newFull, setNewFull] = useState('');
  const [newGender, setNewGender] = useState<Gender>('M');
  const [newGroup, setNewGroup] = useState<AgeGroup>(1);
  const [newPin, setNewPin] = useState('');
  const [newEmoji, setNewEmoji] = useState('🦊');
  const [newPersonalDrive, setNewPersonalDrive] = useState('');
  const [newRestrictedDocs, setNewRestrictedDocs] = useState('');

  // Staff star grant modal state (max 5/grant, max 20/day)
  const [starGroupFilter, setStarGroupFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [grantKid, setGrantKid] = useState<Member | null>(null);
  const [grantAmountStr, setGrantAmountStr] = useState<string>('5');
  const [grantReason, setGrantReason] = useState<string>('ทำความดี / ช่วยเหลืองานบ้าน');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = staffMembers.find((s) => s.pin === pinInput.trim());
    if (!matched) {
      onShowAlert({
        icon: '🔒',
        title: lang === 'th' ? 'รหัส PIN พี่เลี้ยงไม่ถูกต้อง' : 'Invalid Staff PIN',
        message: lang === 'th' ? 'กรุณาตรวจสอบรหัส PIN 4 หลักของพี่เลี้ยงอีกครั้ง' : 'Please check your 4-digit staff PIN.',
        tone: 'pink',
      });
      return;
    }
    setPinInput('');
    onLogin(matched);
    onShowAlert({
      icon: '🧑‍🏫',
      title: lang === 'th' ? `ยินดีต้อนรับ ${matched.nickname}` : `Welcome ${matched.nickname}`,
      message: lang === 'th' ? 'เข้าสู่โหมดพี่เลี้ยงเรียบร้อยแล้ว' : 'Signed in to Staff Mode.',
      tone: 'mint',
    });
  };

  if (!loggedInStaff) {
    return (
      <div className="mx-auto max-w-md py-8">
        <form
          onSubmit={handlePinSubmit}
          className="pastel-card space-y-5 rounded-[32px] border-2 border-[#EBD8C3] bg-white p-8 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#D4F0F0] text-3xl">
            🧑‍🏫
          </div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">{t.staffLoginTitle}</h1>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={t.enterPin4}
            aria-label={t.enterPin4}
            className="min-h-[52px] w-full rounded-[20px] border-2 border-[#EBD8C3] bg-[#FFFDF9] px-4 text-center text-2xl tracking-[0.4em] focus:border-[#3B2F2A] focus:outline-none"
          />
          <button
            type="submit"
            className="pastel-btn min-h-[50px] w-full rounded-[20px] bg-[#3B2F2A] text-base font-bold text-white"
          >
            {t.loginBtn}
          </button>
        </form>
      </div>
    );
  }

  const activeSick = sickReports.filter((r) => !r.resolved);
  const todayStr = formatDateStr(now);
  const staffGivenToday = getStaffStarsGivenToday(loggedInStaff, todayStr);
  const staffRemainingToday = getStaffRemainingDailyStars(loggedInStaff, todayStr);
  const filteredKidsForStars =
    starGroupFilter === 'all' ? kids : kids.filter((k) => k.ageGroup === starGroupFilter);

  const handleOpenGrantStarModal = (kid: Member) => {
    if (staffRemainingToday <= 0) {
      onShowAlert({
        icon: '⭐',
        title: `ครบโควตาให้ดาววันนี้แล้ว (${STAFF_MAX_STARS_PER_DAY}/${STAFF_MAX_STARS_PER_DAY} ⭐)`,
        message: `วันนี้ ${loggedInStaff.nickname} ให้ดาวครบ ${STAFF_MAX_STARS_PER_DAY} ดาวแล้ว สิทธิ์จะรีเซ็ตใหม่ในวันพรุ่งนี้ค่ะ`,
        tone: 'yellow',
      });
      return;
    }
    setGrantKid(kid);
    setGrantAmountStr(String(Math.min(STAFF_MAX_STARS_PER_GRANT, staffRemainingToday)));
    setGrantReason('ทำความดี / ช่วยเหลืองานบ้าน');
  };

  const handleSubmitGrantStars = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantKid) return;
    const parsed = Number(grantAmountStr.trim());
    const res = onGrantStarsByStaff(grantKid, parsed, grantReason);
    if (res.ok) {
      setGrantKid(null);
    }
  };

  const handleResetAllKidsDailyCommands = () => {
    if (!onResetAllDailyCommands) return;
    onShowAlert({
      icon: '🔄',
      title: 'รีเซ็ตปุ่มคำสั่งวันนี้ของเด็กทุกคน?',
      message: `ต้องการรีเซ็ตปุ่มเช็คอิน/ภารกิจประจำวันของน้องทั้ง ${kids.length} คน กลับเป็นค่าเริ่มต้นทั้งหมดใช่หรือไม่? (ยอดดาวสะสมและสิทธิ์พื้นฐานยังคงอยู่)`,
      tone: 'yellow',
      showCancel: true,
      confirmText: 'ยืนยันรีเซ็ตทุกคน',
      onConfirm: () => {
        onResetAllDailyCommands();
        onShowAlert({
          icon: '✨',
          title: 'รีเซ็ตปุ่มคำสั่งของเด็กทุกคนแล้ว',
          message: 'ปุ่มภารกิจของน้องทุกคนกลับมาพร้อมกดเช็คอินใหม่เรียบร้อยค่ะ',
          tone: 'mint',
        });
      },
    });
  };

  const handleCreateKid = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newId.trim();
    const nick = newNick.trim();
    const full = newFull.trim();
    const pin = newPin.trim();
    if (!id || !nick || !full || !/^\d{4}$/.test(pin)) {
      onShowAlert({
        icon: '⚠️',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอก รหัส ID, ชื่อเล่น, ชื่อจริง และ PIN ตัวเลข 4 หลักให้ครบ',
        tone: 'yellow',
      });
      return;
    }
    if (kids.some((k) => k.id.toLowerCase() === id.toLowerCase())) {
      onShowAlert({
        icon: '⚠️',
        title: 'รหัส ID ซ้ำ',
        message: `รหัส ${id} มีอยู่ในระบบแล้ว`,
        tone: 'pink',
      });
      return;
    }

    const created: Member = {
      id,
      role: 'kid',
      nickname: nick,
      fullName: full,
      gender: newGender,
      pin,
      emoji: newEmoji || '🌟',
      ageGroup: newGroup,
      stars: 50,
      lateFineThb: 0,
      freeDayPenaltyCount: 0,
      kitchenDutyToday: false,
      personalDriveUrl: newPersonalDrive.trim(),
      restrictedDocsUrl: newRestrictedDocs.trim(),
      mySpace: {
        favoriteColor: 'ฟ้า',
        favoriteFood: 'ข้าวผัด',
        favoritePet: 'แมว',
        futureDream: 'เติบโตอย่างมีความสุข',
      },
      selectedCoverIndex: 0,
      unlockedCovers: [0],
      ownedShopItemIds: [],
      equippedAccessoryIds: [],
      collectedLocationItemIds: [],
      dailyProgress: { dateStr: todayStr },
      penalties: [],
      starHistory: [
        {
          id: `init_${Date.now()}`,
          timestamp: formatTimeHMS(now),
          dateStr: todayStr,
          amount: 50,
          label: 'ดาวต้อนรับสมาชิกใหม่',
          type: 'staff',
        },
      ],
    };

    onAddKid(created);
    setNewId('');
    setNewNick('');
    setNewFull('');
    setNewPin('');
    setNewPersonalDrive('');
    setNewRestrictedDocs('');
  };

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className="pastel-card flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-[#EBD8C3] bg-[#D4F0F0]/70 p-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">
            🧑‍🏫 โหมดพี่เลี้ยง · {loggedInStaff.fullName}
          </h1>
          <p className="text-sm text-[#5C4B43]">
            มอบดาวน้อง (ครั้งละไม่เกิน {STAFF_MAX_STARS_PER_GRANT}⭐ · วันละ {STAFF_MAX_STARS_PER_DAY}⭐) · ตั้งค่าปุ่มคำสั่ง · แจ้งป่วย · บิลแลกขนม
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onToggleHolidayToday && (
            <button
              type="button"
              onClick={onToggleHolidayToday}
              data-testid="staff-holiday-toggle"
              className={`pastel-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-[18px] border-2 px-4 py-2 text-sm font-bold transition-colors ${
                isHolidayToday
                  ? 'border-[#3B2F2A] bg-[#E7FAF6] text-[#114B43]'
                  : 'border-[#EBD8C3] bg-white text-[#5C4B43] hover:bg-[#FFF5BA]'
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>
                {isHolidayToday ? '🏖️ โหมดวันหยุด: เปิดอยู่ ✓' : '🏖️ เปิดโหมดวันหยุดวันนี้'}
              </span>
            </button>
          )}
          {onResetAllDailyCommands && (
            <button
              type="button"
              onClick={handleResetAllKidsDailyCommands}
              aria-label="รีเซ็ตปุ่มคำสั่งเด็กทุกคนวันนี้"
              className="pastel-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-[18px] border-2 border-[#F0A8B2] bg-[#FADADD]/70 px-4 py-2 text-sm font-bold text-[#9F1239] hover:bg-[#FADADD]"
            >
              <RotateCcw className="h-4 w-4" /> รีเซ็ตปุ่มวันนี้ทุกคน
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="pastel-btn min-h-[44px] rounded-[18px] border-2 border-[#EBD8C3] bg-white px-4 py-2 text-sm font-bold text-[#3B2F2A]"
          >
            {t.logoutBtn}
          </button>
        </div>
      </div>

      {/* Offline / Unsynced Cloud Sync Reminder Strip */}
      {cloudSyncStatus !== 'synced' && (
        <div
          data-testid="staff-cloud-reminder"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-2 border-[#E8D575] bg-[#FFFBEB] px-4 py-3 text-sm text-[#713F12]"
        >
          <div className="flex items-center gap-2 font-semibold">
            <span>🔔</span>
            <span>
              กำลังบันทึกข้อมูลเฉพาะเครื่องนี้ — กดเชื่อมต่อ Cloud Sync เพื่อซิงก์ข้อมูลข้ามเครื่องพี่เลี้ยงและผู้จัดการ
            </span>
          </div>
          {onConnectCloud && (
            <button
              type="button"
              onClick={onConnectCloud}
              className="pastel-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#74CCB8] bg-[#E7FAF6] px-3.5 text-xs font-bold text-[#114B43] hover:bg-[#D4F0F0]"
            >
              <Cloud className="h-3.5 w-3.5" /> เชื่อมต่อ Cloud Sync
            </button>
          )}
        </div>
      )}

      {/* Door Command Buttons Configurator */}
      <DoorCommandsManagerSection
        lang={lang}
        kids={kids}
        doorCommands={doorCommands}
        onSaveDoorCommands={onSaveDoorCommands}
        onShowAlert={onShowAlert}
      />

      {/* 1. Daily Sick Kids Alert Table */}
      <section className="pastel-card rounded-[28px] border-2 border-[#F0A8B2] bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-[#3B2F2A]">
          🤒 ตารางแจ้งเตือนเด็กป่วยประจำวัน ({activeSick.length})
        </h2>
        {activeSick.length === 0 ? (
          <p className="rounded-[18px] bg-[#D4F0F0]/50 p-4 text-sm text-[#134E4A]">
            {t.noSickToday}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EBD8C3] text-[#705F56]">
                  <th className="py-2.5 pr-3">น้อง</th>
                  <th className="py-2.5 pr-3">อาการ</th>
                  <th className="py-2.5 pr-3">รายละเอียด</th>
                  <th className="py-2.5 pr-3">เวลาแจ้ง</th>
                  <th className="py-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {activeSick.map((rep) => (
                  <tr key={rep.id} className="border-b border-[#F5ECE2]">
                    <td className="py-3 pr-3 font-bold">{rep.kidNickname}</td>
                    <td className="py-3 pr-3">{rep.symptom}</td>
                    <td className="py-3 pr-3 text-[#5C4B43]">{rep.details}</td>
                    <td className="tabular-nums py-3 pr-3 text-xs">{rep.dateStr} {rep.reportedAt}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onResolveSick(rep.id, rep.kidId)}
                        className="pastel-btn min-h-[40px] rounded-xl bg-[#D4F0F0] px-4 py-1.5 text-xs font-bold text-[#134E4A] hover:bg-[#BAE6E6]"
                      >
                        ✅ หายป่วยแล้ว
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Staff Star Granting Panel (Tap a child's name -> 1..5 stars, max 20/day) */}
      <section
        data-testid="staff-star-grant-section"
        className="pastel-card rounded-[28px] border-2 border-[#E8D575] bg-white p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
              <Star className="h-5 w-5 text-[#D97706]" /> มอบดาวให้น้อง (กดเลือกชื่อน้อง)
            </h2>
            <p className="text-xs text-[#705F56]">
              กดชื่อน้องที่ต้องการแล้วกรอกจำนวนดาวที่มอบให้ · ได้ครั้งละไม่เกิน {STAFF_MAX_STARS_PER_GRANT} ⭐ · สูงสุด {STAFF_MAX_STARS_PER_DAY} ⭐/วัน
            </p>
          </div>
          <div
            data-testid="staff-daily-star-quota"
            className={`inline-flex items-center gap-2 rounded-2xl border-2 px-3.5 py-2 text-xs font-bold ${
              staffRemainingToday > 0
                ? 'border-[#E8D575] bg-[#FFF5BA] text-[#713F12]'
                : 'border-[#F0A8B2] bg-[#FADADD] text-[#9F1239]'
            }`}
          >
            <span>โควตาวันนี้ ({loggedInStaff.nickname}):</span>
            <span className="tabular-nums">
              เหลือ {staffRemainingToday} / {STAFF_MAX_STARS_PER_DAY} ⭐ (ให้แล้ว {staffGivenToday} ⭐)
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: `ทั้งหมด (${kids.length})` },
              { id: 1, label: `กลุ่ม 1 (${kids.filter((k) => k.ageGroup === 1).length})` },
              { id: 2, label: `กลุ่ม 2 (${kids.filter((k) => k.ageGroup === 2).length})` },
              { id: 3, label: `กลุ่ม 3 (${kids.filter((k) => k.ageGroup === 3).length})` },
            ] as const
          ).map((tab) => (
            <button
              key={String(tab.id)}
              type="button"
              onClick={() => setStarGroupFilter(tab.id)}
              className={`min-h-[36px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                starGroupFilter === tab.id
                  ? 'border-[#3B2F2A] bg-[#3B2F2A] text-white'
                  : 'border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43] hover:bg-[#FAF4EC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {filteredKidsForStars.map((kid) => (
            <button
              key={kid.id}
              type="button"
              data-testid={`staff-star-kid-${kid.id}`}
              onClick={() => handleOpenGrantStarModal(kid)}
              className="pastel-btn flex items-center justify-between gap-2 rounded-[20px] border-2 border-[#EBD8C3] bg-[#FFFDF9] px-3.5 py-3 text-left transition-colors hover:border-[#E8D575] hover:bg-[#FFFBEB]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-[#3B2F2A]">
                  {kid.emoji} {kid.nickname}
                </div>
                <div className="text-[11px] text-[#705F56]">
                  {kid.id} · กลุ่ม {kid.ageGroup}
                </div>
              </div>
              <div className="shrink-0 rounded-xl bg-[#FFF5BA] px-2 py-1 text-xs font-bold text-[#B45309] tabular-nums">
                {kid.stars.toLocaleString()} ⭐
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Weekly Friday Free Day & Monthly Summary */}
      <PeriodicSummarySection lang={lang} now={now} kids={kids} sickReports={sickReports} />

      {/* 3. Add New Child & Daily Snack Bills */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
            <Plus className="h-5 w-5" /> เพิ่มรายชื่อเด็กใหม่ & ลิงก์แฟ้มเอกสาร
          </h2>
          <form onSubmit={handleCreateKid} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="รหัส ID (เช่น j6)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            />
            <input
              type="text"
              placeholder="ชื่อเล่น"
              value={newNick}
              onChange={(e) => setNewNick(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            />
            <input
              type="text"
              placeholder="ชื่อ-นามสกุลจริง"
              value={newFull}
              onChange={(e) => setNewFull(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm sm:col-span-2"
            />
            <select
              value={newGender}
              onChange={(e) => setNewGender(e.target.value as Gender)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            >
              <option value="M">เพศชาย (M)</option>
              <option value="F">เพศหญิง (F)</option>
            </select>
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(Number(e.target.value) as AgeGroup)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            >
              <option value={1}>กลุ่ม 1 (ประถม)</option>
              <option value={2}>กลุ่ม 2 (มัธยม)</option>
              <option value={3}>กลุ่ม 3 (วิทยาลัย)</option>
            </select>
            <input
              type="text"
              maxLength={4}
              placeholder="รหัส PIN 4 หลัก"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            />
            <input
              type="text"
              placeholder="อิโมจิ (เช่น 🐼)"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] px-3 text-sm"
            />
            <input
              type="url"
              placeholder="Personal Drive URL (ผลงานน้อง)"
              value={newPersonalDrive}
              onChange={(e) => setNewPersonalDrive(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#98CBEB] px-3 text-sm sm:col-span-2"
            />
            <input
              type="url"
              placeholder="Restricted Docs URL (แฟ้มเอกสารราชการลับ)"
              value={newRestrictedDocs}
              onChange={(e) => setNewRestrictedDocs(e.target.value)}
              className="min-h-[42px] rounded-xl border-2 border-[#F0A8B2] px-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              className="pastel-btn min-h-[46px] rounded-[18px] bg-[#3B2F2A] font-bold text-white sm:col-span-2"
            >
              + เพิ่มรายชื่อเด็กเข้าระบบ
            </button>
          </form>
        </section>

        <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
          <h2 className="mb-3 text-lg font-bold text-[#3B2F2A]">
            🧾 สรุปบิลแลกขนม & รางวัลประจำวัน ({snackBills.length})
          </h2>
          {snackBills.length === 0 ? (
            <p className="rounded-[18px] bg-[#FFFDF9] p-4 text-sm text-[#705F56]">
              ยังไม่มีรายการแลกขนมวันนี้
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {snackBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-[#EBD8C3] bg-[#FFFDF9] px-4 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-bold text-[#3B2F2A]">
                      {bill.kidNickname} · {bill.itemName}
                    </div>
                    <div className="text-xs text-[#705F56]">
                      {bill.dateStr} {bill.createdAt} · {bill.priceStars} ⭐
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={bill.fulfilled}
                    onClick={() => onFulfillBill(bill.id)}
                    className={`min-h-[36px] rounded-xl px-3 text-xs font-bold ${
                      bill.fulfilled
                        ? 'bg-[#D4F0F0] text-[#134E4A]'
                        : 'bg-[#FFF5BA] text-[#3B2F2A]'
                    }`}
                  >
                    {bill.fulfilled ? 'ส่งมอบแล้ว ✓' : 'กดส่งมอบขนม'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Staff Star Grant Modal (Max 5 per grant, Max 20 per day) */}
      {grantKid && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`มอบดาวให้น้อง ${grantKid.nickname}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSubmitGrantStars}
            className="pastel-card w-full max-w-md space-y-4 rounded-[30px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#EBD8C3] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#3B2F2A]">
                  ⭐ มอบดาวให้น้อง {grantKid.emoji} {grantKid.nickname}
                </h3>
                <p className="text-xs text-[#705F56]">
                  {grantKid.fullName} · กลุ่ม {grantKid.ageGroup} · ดาวปัจจุบัน {grantKid.stars.toLocaleString()} ⭐
                </p>
              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่างให้ดาวน้อง"
                onClick={() => setGrantKid(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#E8D575] bg-[#FFFBEB] px-3.5 py-2.5 text-xs font-semibold text-[#713F12]">
              สิทธิ์ให้ดาววันนี้ ({loggedInStaff.nickname}): เหลือ {staffRemainingToday} / {STAFF_MAX_STARS_PER_DAY} ⭐ (ให้ได้ครั้งละไม่เกิน {STAFF_MAX_STARS_PER_GRANT} ⭐)
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-[#5C4B43]">
                1. เลือกหรือกรอกจำนวนดาว (1–{STAFF_MAX_STARS_PER_GRANT} ⭐)
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((amt) => {
                  const disabled = amt > staffRemainingToday;
                  const active = grantAmountStr === String(amt);
                  return (
                    <button
                      key={amt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setGrantAmountStr(String(amt))}
                      className={`min-h-[38px] min-w-[54px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                        disabled
                          ? 'cursor-not-allowed border-[#EBD8C3] bg-[#F5ECE2] text-[#A89B92] opacity-60'
                          : active
                            ? 'border-[#3B2F2A] bg-[#FFF5BA] text-[#3B2F2A]'
                            : 'border-[#EBD8C3] bg-white text-[#5C4B43] hover:bg-[#FAF4EC]'
                      }`}
                    >
                      +{amt} ⭐
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min={1}
                max={STAFF_MAX_STARS_PER_GRANT}
                step={1}
                value={grantAmountStr}
                onChange={(e) => setGrantAmountStr(e.target.value)}
                aria-label="จำนวนดาวที่มอบให้น้อง"
                placeholder={`ระบุจำนวนดาว (1-${STAFF_MAX_STARS_PER_GRANT})`}
                className="min-h-[44px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm font-bold text-[#3B2F2A]"
              />
              {Number(grantAmountStr) > STAFF_MAX_STARS_PER_GRANT && (
                <p className="mt-1 text-xs font-bold text-[#9F1239]">
                  ⚠️ ให้ดาวได้ครั้งละไม่เกิน {STAFF_MAX_STARS_PER_GRANT} ดาวค่ะ
                </p>
              )}
              {Number(grantAmountStr) <= STAFF_MAX_STARS_PER_GRANT &&
                Number(grantAmountStr) > staffRemainingToday && (
                  <p className="mt-1 text-xs font-bold text-[#9F1239]">
                    ⚠️ เกินโควตาวันนี้ (เหลือให้ได้อีก {staffRemainingToday} ⭐ จาก {STAFF_MAX_STARS_PER_DAY} ⭐)
                  </p>
                )}
            </div>

            <div>
              <div className="mb-1.5 text-xs font-bold text-[#5C4B43]">
                2. เหตุผลในการให้ดาว
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  'ทำความดี / ช่วยเหลืองานบ้าน',
                  'มีน้ำใจช่วยเพื่อนและน้อง',
                  'ตั้งใจเรียน / ท่องคำศัพท์เก่ง',
                  'พูดจาไพเราะ มีมารยาทดี',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGrantReason(preset)}
                    className={`min-h-[34px] rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      grantReason === preset
                        ? 'border-[#3B2F2A] bg-[#FADADD] text-[#3B2F2A]'
                        : 'border-[#EBD8C3] bg-white text-[#5C4B43] hover:bg-[#FAF4EC]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="พิมพ์เหตุผลเพิ่มเติม..."
                aria-label="เหตุผลการให้ดาวน้อง"
                className="min-h-[42px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm text-[#3B2F2A]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGrantKid(null)}
                className="min-h-[44px] flex-1 rounded-[16px] border-2 border-[#EBD8C3] bg-white text-sm font-bold text-[#5C4B43]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="pastel-btn min-h-[44px] flex-1 rounded-[16px] bg-[#3B2F2A] text-sm font-bold text-white"
              >
                ⭐ ยืนยันให้ +{Math.max(0, Math.round(Number(grantAmountStr) || 0))} ⭐
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
