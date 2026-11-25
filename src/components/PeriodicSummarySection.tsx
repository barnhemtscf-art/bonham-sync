import React, { useState } from 'react';
import { CalendarDays, Trophy } from 'lucide-react';
import { Language, Member, SickReport } from '../types/barnhem';
import { buildWeeklyMonthlySummary } from '../utils/rules';

interface PeriodicSummarySectionProps {
  lang: Language;
  now: Date;
  kids: Member[];
  sickReports: SickReport[];
}

export const PeriodicSummarySection: React.FC<PeriodicSummarySectionProps> = ({
  lang,
  now,
  kids,
  sickReports,
}) => {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const summary = buildWeeklyMonthlySummary(kids, sickReports, now, lang);

  return (
    <section className="pastel-card rounded-[28px] border border-[#EBD8C3] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
            <CalendarDays className="h-5 w-5 text-[#0F766E]" />
            <span>
              {lang === 'th'
                ? 'สรุปประจำสัปดาห์วันศุกร์ & ประจำเดือน'
                : 'Weekly Friday Free Day & Monthly Summary'}
            </span>
          </h2>
          <p className="text-xs text-[#705F56]">
            {lang === 'th'
              ? `รอบ 7 วันล่าสุด (${summary.weekStartStr} ถึงวันนี้) · ประจำเดือน ${summary.monthLabel}`
              : `Last 7 days (${summary.weekStartStr} to today) · Month ${summary.monthLabel}`}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#EBD8C3] bg-[#FFFDF9] p-1">
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 text-xs font-bold transition-colors ${
              tab === 'weekly'
                ? 'bg-[#D4F0F0] text-[#134E4A]'
                : 'text-[#5C4B43] hover:bg-[#FAF4EC]'
            }`}
          >
            {lang === 'th' ? 'สัปดาห์นี้ · Free Day วันศุกร์' : 'Weekly · Friday Free Day'}
          </button>
          <button
            type="button"
            onClick={() => setTab('monthly')}
            className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 text-xs font-bold transition-colors ${
              tab === 'monthly'
                ? 'bg-[#FFF5BA] text-[#61450B]'
                : 'text-[#5C4B43] hover:bg-[#FAF4EC]'
            }`}
          >
            {lang === 'th' ? `ประจำเดือน (${summary.monthLabel})` : 'Monthly Overview'}
          </button>
        </div>
      </div>

      {/* Top 4 Summary Strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[18px] border border-[#8AD3D3] bg-[#E7FAF6] px-4 py-3">
          <div className="text-xs font-semibold text-[#114B43]">
            {lang === 'th' ? 'ได้ Free Day เต็มที่' : 'Full Free Day'}
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-[#134E4A]">
            {summary.freeDayEligibleCount} / {kids.length}
          </div>
        </div>

        <div className="rounded-[18px] border border-[#F0A8B2] bg-[#FFF2F4] px-4 py-3">
          <div className="text-xs font-semibold text-[#9F1239]">
            {lang === 'th' ? 'ถูกหักสิทธิ์ Free Day' : 'Free Day Deducted'}
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-[#9F1239]">
            {summary.freeDayDeductedCount} {lang === 'th' ? 'คน' : 'kids'}
          </div>
        </div>

        <div className="rounded-[18px] border border-[#E8D575] bg-[#FFFBEB] px-4 py-3">
          <div className="text-xs font-semibold text-[#713F12]">
            {tab === 'weekly'
              ? lang === 'th'
                ? 'ดาวที่ได้รับ (7 วัน)'
                : 'Stars Earned (7d)'
              : lang === 'th'
                ? 'ดาวที่ได้รับเดือนนี้'
                : 'Stars Earned (Month)'}
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-[#B45309]">
            {(tab === 'weekly' ? summary.totalEarned7d : summary.totalEarnedMonth).toLocaleString()} ⭐
          </div>
        </div>

        <div className="rounded-[18px] border border-[#F2B593] bg-[#FFF5EE] px-4 py-3">
          <div className="text-xs font-semibold text-[#7C2D12]">
            {lang === 'th' ? 'ค่าปรับสายคงค้างรวม' : 'Total Outstanding Fines'}
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-[#9F1239]">
            {summary.totalLateFinesThb.toLocaleString()} ฿
          </div>
        </div>
      </div>

      {tab === 'monthly' && summary.monthlyTopEarners.length > 0 && (
        <div className="mb-4 rounded-[20px] border border-[#E8D575] bg-[#FFFDF2] p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#713F12]">
            <Trophy className="h-4 w-4 text-[#D97706]" />
            <span>
              {lang === 'th'
                ? `เด็กดีเด่นเก็บดาวสูงสุดประจำเดือน ${summary.monthLabel} (เฉพาะผู้ดูแล)`
                : `Top Monthly Star Earners · ${summary.monthLabel}`}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {summary.monthlyTopEarners.map((entry, idx) => (
              <div
                key={entry.kid.id}
                className="flex items-center justify-between rounded-xl border border-[#EBD8C3] bg-white px-3 py-2 text-xs sm:flex-col sm:items-start sm:gap-0.5"
              >
                <span className="font-bold text-[#3B2F2A]">
                  #{idx + 1} {entry.kid.emoji} {entry.kid.nickname}
                </span>
                <span className="tabular-nums font-bold text-[#B45309]">
                  +{entry.earnedStarsMonth.toLocaleString()} ⭐
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="sticky top-0 border-b border-[#EBD8C3] bg-[#FFFDF9] text-xs text-[#5C4B43]">
              <th className="py-2.5 px-2">{lang === 'th' ? 'น้อง' : 'Child'}</th>
              <th className="py-2.5 px-2">{lang === 'th' ? 'กลุ่ม' : 'Group'}</th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'ดาว 7 วัน' : '7d Stars'}
              </th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'ดาวเดือนนี้' : 'Month Stars'}
              </th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'แลกขนม/ของเดือนนี้' : 'Spent'}
              </th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'ป่วย (ครั้ง)' : 'Sick'}
              </th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'ค่าปรับ (฿)' : 'Fine'}
              </th>
              <th className="py-2.5 px-2 text-right">
                {lang === 'th' ? 'สิทธิ์ Free Day ศุกร์นี้' : 'Friday Free Day'}
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.kid.id} className="border-b border-[#F5ECE2] hover:bg-[#FFFDF9]">
                <td className="py-2 px-2 font-bold text-[#3B2F2A]">
                  {row.kid.emoji} {row.kid.nickname}
                </td>
                <td className="py-2 px-2 text-xs text-[#705F56]">
                  {lang === 'th' ? `กลุ่ม ${row.kid.ageGroup}` : `G${row.kid.ageGroup}`}
                </td>
                <td className="tabular-nums py-2 px-2 text-right font-semibold text-[#0F766E]">
                  +{row.earnedStars7d.toLocaleString()}
                </td>
                <td className="tabular-nums py-2 px-2 text-right font-semibold text-[#B45309]">
                  +{row.earnedStarsMonth.toLocaleString()}
                </td>
                <td className="tabular-nums py-2 px-2 text-right text-xs text-[#705F56]">
                  -{row.spentStarsMonth.toLocaleString()}
                </td>
                <td className="tabular-nums py-2 px-2 text-right text-xs text-[#705F56]">
                  {row.sickDaysMonth}
                </td>
                <td className="tabular-nums py-2 px-2 text-right font-semibold text-[#9F1239]">
                  {row.kid.lateFineThb}
                </td>
                <td className="py-2 px-2 text-right text-xs font-semibold">
                  {row.freeDayEligible ? (
                    <span className="text-[#134E4A]">✅ {lang === 'th' ? 'ได้สิทธิ์ปกติ' : 'Eligible'}</span>
                  ) : (
                    <span className="text-[#9F1239]">
                      ⚠️ {lang === 'th' ? `หัก ${row.kid.freeDayPenaltyCount} วัน` : `-${row.kid.freeDayPenaltyCount}d`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
