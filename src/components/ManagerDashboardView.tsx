import React, { useState } from 'react';
import { ExternalLink, FileLock2 } from 'lucide-react';
import { UI_TEXT } from '../data/seedData';
import { AlertModalPayload, Language, Member, SickReport } from '../types/barnhem';
import { PeriodicSummarySection } from './PeriodicSummarySection';

interface ManagerDashboardViewProps {
  lang: Language;
  now: Date;
  loggedInManager: Member | null;
  managerMembers: Member[];
  kids: Member[];
  sickReports: SickReport[];
  onLogin: (manager: Member) => void;
  onLogout: () => void;
  onShowAlert: (payload: Omit<AlertModalPayload, 'id'>) => void;
}

export const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({
  lang,
  now,
  loggedInManager,
  managerMembers,
  kids,
  sickReports,
  onLogin,
  onLogout,
  onShowAlert,
}) => {
  const t = UI_TEXT[lang];
  const [pinInput, setPinInput] = useState('');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = managerMembers.find((m) => m.pin === pinInput.trim());
    if (!matched) {
      onShowAlert({
        icon: '🔒',
        title: lang === 'th' ? 'รหัส PIN ผู้จัดการไม่ถูกต้อง' : 'Invalid Manager PIN',
        message:
          lang === 'th'
            ? 'กรุณากรอก PIN 4 หลักของผู้จัดการ (SuSan: 9015 / พี่เหว่า: 4382)'
            : 'Please enter a valid 4-digit Manager PIN.',
        tone: 'pink',
      });
      return;
    }
    setPinInput('');
    onLogin(matched);
  };

  if (!loggedInManager) {
    return (
      <div className="mx-auto max-w-md py-8">
        <form
          onSubmit={handlePinSubmit}
          className="pastel-card space-y-5 rounded-[32px] border-2 border-[#EBD8C3] bg-white p-8 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#DCEEF8] text-3xl">
            📊
          </div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">{t.managerLoginTitle}</h1>
          <p className="text-xs text-[#705F56]">
            {lang === 'th'
              ? 'PIN 9015 (SuSan) สลับเป็นภาษาอังกฤษอัตโนมัติ · PIN 4382 (พี่เหว่า) แสดงภาษาไทย'
              : 'PIN 9015 (SuSan) auto-switches to English · PIN 4382 switches to Thai'}
          </p>
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
  const totalStars = kids.reduce((acc, k) => acc + k.stars, 0);
  const totalFines = kids.reduce((acc, k) => acc + k.lateFineThb, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pastel-card flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-[#EBD8C3] bg-[#DCEEF8]/70 p-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">{t.managerTitle}</h1>
          <p className="text-sm text-[#5C4B43]">
            {loggedInManager.fullName} · {lang === 'en' ? 'English Mode Active' : 'โหมดภาษาไทย'}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="pastel-btn min-h-[44px] rounded-[18px] border-2 border-[#EBD8C3] bg-white px-4 py-2 text-sm font-bold text-[#3B2F2A]"
        >
          {t.logoutBtn}
        </button>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="pastel-card rounded-[24px] border-2 border-[#98CBEB] bg-[#DCEEF8] p-5">
          <div className="text-sm font-semibold text-[#1E4460]">{t.totalKids}</div>
          <div className="tabular-nums mt-2 text-3xl font-bold text-[#3B2F2A]">{kids.length}</div>
        </div>
        <div className="pastel-card rounded-[24px] border-2 border-[#F0A8B2] bg-[#FADADD] p-5">
          <div className="text-sm font-semibold text-[#831843]">{t.sickToday}</div>
          <div className="tabular-nums mt-2 text-3xl font-bold text-[#3B2F2A]">{activeSick.length}</div>
        </div>
        <div className="pastel-card rounded-[24px] border-2 border-[#E8D575] bg-[#FFF5BA] p-5">
          <div className="text-sm font-semibold text-[#713F12]">{t.totalStars}</div>
          <div className="tabular-nums mt-2 text-3xl font-bold text-[#3B2F2A]">
            {totalStars.toLocaleString()} ⭐
          </div>
        </div>
        <div className="pastel-card rounded-[24px] border-2 border-[#F2B593] bg-[#FDE2D2] p-5">
          <div className="text-sm font-semibold text-[#7C2D12]">{t.totalFines}</div>
          <div className="tabular-nums mt-2 text-3xl font-bold text-[#3B2F2A]">
            {totalFines.toLocaleString()} ฿
          </div>
        </div>
      </div>

      {/* Health Alerts */}
      <section className="pastel-card rounded-[28px] border-2 border-[#F0A8B2] bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-[#3B2F2A]">🏥 {t.healthAlerts}</h2>
        {activeSick.length === 0 ? (
          <p className="rounded-[18px] bg-[#D4F0F0]/50 p-4 text-sm text-[#134E4A]">{t.noSickToday}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EBD8C3] text-[#705F56]">
                  <th className="py-2 pr-3">{lang === 'en' ? 'Child' : 'ชื่อน้อง'}</th>
                  <th className="py-2 pr-3">{lang === 'en' ? 'Symptom' : 'อาการ'}</th>
                  <th className="py-2 pr-3">{lang === 'en' ? 'Details' : 'รายละเอียด'}</th>
                  <th className="py-2">{lang === 'en' ? 'Reported At' : 'เวลาแจ้ง'}</th>
                </tr>
              </thead>
              <tbody>
                {activeSick.map((rep) => (
                  <tr key={rep.id} className="border-b border-[#F5ECE2]">
                    <td className="py-2.5 pr-3 font-bold">{rep.kidNickname}</td>
                    <td className="py-2.5 pr-3">{rep.symptom}</td>
                    <td className="py-2.5 pr-3">{rep.details}</td>
                    <td className="tabular-nums py-2.5 text-xs">{rep.dateStr} {rep.reportedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Weekly Friday Free Day & Monthly Summary */}
      <PeriodicSummarySection lang={lang} now={now} kids={kids} sickReports={sickReports} />

      {/* Comprehensive Behavior & Docs Table */}
      <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-[#3B2F2A]">📑 {t.behaviorTable}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]">
                <th className="py-3 px-2">ID</th>
                <th className="py-3 px-2">{lang === 'en' ? 'Name' : 'ชื่อเล่น / ชื่อจริง'}</th>
                <th className="py-3 px-2">{lang === 'en' ? 'Group' : 'กลุ่ม'}</th>
                <th className="py-3 px-2 text-right">{lang === 'en' ? 'Stars' : 'ดาวสะสม'}</th>
                <th className="py-3 px-2 text-right">{lang === 'en' ? 'Fines (THB)' : 'ค่าปรับ'}</th>
                <th className="py-3 px-2">{lang === 'en' ? 'Status' : 'สถานะความประพฤติ'}</th>
                <th className="py-3 px-2 text-right">{lang === 'en' ? 'Document Folders' : 'แฟ้มเอกสาร'}</th>
              </tr>
            </thead>
            <tbody>
              {kids.map((kid) => (
                <tr key={kid.id} className="border-b border-[#F5ECE2] hover:bg-[#FFFDF9]">
                  <td className="py-3 px-2 font-mono text-xs">{kid.id}</td>
                  <td className="py-3 px-2">
                    <div className="font-bold">
                      {kid.emoji} {kid.nickname}
                    </div>
                    <div className="text-xs text-[#705F56]">{kid.fullName}</div>
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {lang === 'en' ? `Group ${kid.ageGroup}` : `กลุ่ม ${kid.ageGroup}`}
                  </td>
                  <td className="tabular-nums py-3 px-2 text-right font-bold text-[#B45309]">
                    {kid.stars.toLocaleString()} ⭐
                  </td>
                  <td className="tabular-nums py-3 px-2 text-right font-bold text-[#9F1239]">
                    {kid.lateFineThb} ฿
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {kid.dailyProgress.isSickToday
                      ? lang === 'en'
                        ? '🤒 Sick Rest'
                        : '🤒 พักป่วย'
                      : kid.phoneBlockedReason
                        ? `⛔ ${kid.phoneBlockedReason}`
                        : lang === 'en'
                          ? '✅ Good Standing'
                          : '✅ ปกติดี'}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <a
                        href={kid.personalDriveUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-[#98CBEB] bg-[#DCEEF8] px-2.5 text-xs font-semibold text-[#1E4460]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {t.personalDrive}
                      </a>
                      <a
                        href={kid.restrictedDocsUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-[#F0A8B2] bg-[#FADADD] px-2.5 text-xs font-semibold text-[#831843]"
                      >
                        <FileLock2 className="h-3.5 w-3.5" /> {t.restrictedDocs}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
