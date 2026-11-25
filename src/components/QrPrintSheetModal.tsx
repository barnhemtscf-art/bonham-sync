import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X } from 'lucide-react';
import { Language, Member } from '../types/barnhem';
import { buildMemberQrPayload } from '../utils/rules';

interface QrPrintSheetModalProps {
  lang: Language;
  isOpen: boolean;
  members: Member[];
  onClose: () => void;
}

type SheetFilter = 'kids' | 'all' | 'staff_mgr';

export const QrPrintSheetModal: React.FC<QrPrintSheetModalProps> = ({
  lang,
  isOpen,
  members,
  onClose,
}) => {
  const [filter, setFilter] = useState<SheetFilter>('staff_mgr');
  const [showPin, setShowPin] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const filteredMembers = useMemo(() => {
    if (filter === 'kids') return members.filter((m) => m.role === 'kid');
    if (filter === 'staff_mgr') return members.filter((m) => m.role !== 'kid');
    return members;
  }, [filter, members]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const generateAll = async () => {
      const entries = await Promise.all(
        filteredMembers.map(async (m) => {
          const payload = buildMemberQrPayload(m);
          const url = await QRCode.toDataURL(payload, {
            width: 220,
            margin: 1,
            color: { dark: '#3B2F2A', light: '#FFFFFF' },
          });
          return [m.id, url] as const;
        })
      );
      if (active) {
        setQrMap(Object.fromEntries(entries));
      }
    };
    void generateAll();
    return () => {
      active = false;
    };
  }, [filteredMembers, isOpen]);

  if (!isOpen) return null;

  const isAll21 = filter === 'all' && filteredMembers.length > 15;
  const gridColsClass = isAll21
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'th' ? 'พิมพ์บัตร QR รวมหน้าเดียว' : 'Single-Page Printable QR Sheet'}
      className="print-only-sheet-wrapper fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm md:p-6"
    >
      <div className="print-only-sheet-card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-4 shadow-2xl md:p-6">
        {/* Controls (hidden when printing) */}
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#EBD8C3] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[#3B2F2A] md:text-xl">
              🖨️{' '}
              {lang === 'th'
                ? 'พิมพ์บัตร QR รวมหน้าเดียว (A4 แผ่นเดียวตัดแจกได้ทันที)'
                : 'Single-Page Printable QR Badges (A4)'}
            </h2>
            <p className="text-xs text-[#705F56]">
              {lang === 'th'
                ? 'จัดเรียงพอดีกระดาษ A4 1 แผ่น พร้อมเส้นประสำหรับตัดเป็นบัตรประจำตัวน้องๆ'
                : 'Formatted to fit cleanly on 1 A4 page with dashed cut lines.'}
            </p>
          </div>

          <button
            type="button"
            aria-label={lang === 'th' ? 'ปิดหน้าต่างพิมพ์รวม' : 'Close Print Sheet'}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Options Bar (hidden when printing) */}
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  key: 'kids',
                  label:
                    lang === 'th'
                      ? `น้องๆ (${members.filter((m) => m.role === 'kid').length} คน · 1 หน้า)`
                      : `Kids (${members.filter((m) => m.role === 'kid').length})`,
                },
                {
                  key: 'all',
                  label:
                    lang === 'th'
                      ? `สมาชิกทั้งหมด (${members.length} คน · 1 หน้า)`
                      : `All Members (${members.length})`,
                },
                {
                  key: 'staff_mgr',
                  label:
                    lang === 'th'
                      ? `พี่เลี้ยง & ผู้จัดการ (${members.filter((m) => m.role !== 'kid').length} คน)`
                      : `Staff & Managers (${members.filter((m) => m.role !== 'kid').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`min-h-[38px] rounded-[14px] px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === tab.key
                    ? 'bg-[#3B2F2A] text-white'
                    : 'border border-[#EBD8C3] bg-white text-[#5C4B43]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#5C4B43]">
              <input
                type="checkbox"
                checked={showPin}
                onChange={(e) => setShowPin(e.target.checked)}
                className="h-4 w-4 accent-[#3B2F2A]"
              />
              <span>
                {lang === 'th' ? 'แสดงรหัส PIN บนบัตร' : 'Show 4-digit PIN on cards'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => window.print()}
              className="pastel-btn inline-flex min-h-[42px] items-center gap-2 rounded-[16px] bg-[#3B2F2A] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#52423B] sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              <span>{lang === 'th' ? 'สั่งพิมพ์หน้าเดียว' : 'Print Single Page'}</span>
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Grid */}
        <div className="overflow-y-auto pr-1 print:overflow-visible print:pr-0">
          <div className="mb-2 hidden items-center justify-between border-b border-[#EBD8C3] pb-1 text-xs font-bold text-[#3B2F2A] print:flex">
            <span>🏡 Barnhem Care & Kids — QR ID Cards ({filteredMembers.length})</span>
            <span>{lang === 'th' ? 'บัตรประจำตัว & สแกนเข้าสู่ระบบพนักงาน' : 'Member Cards & Staff QR Login'}</span>
          </div>

          <div className={`grid gap-2.5 print:gap-1.5 ${gridColsClass}`}>
            {filteredMembers.map((m) => {
              const roleText =
                m.role === 'manager'
                  ? lang === 'th'
                    ? 'ผู้จัดการ'
                    : 'Manager'
                  : m.role === 'staff'
                    ? lang === 'th'
                      ? 'พี่เลี้ยง'
                      : 'Staff'
                    : lang === 'th'
                      ? `กลุ่ม ${m.ageGroup}`
                      : `Group ${m.ageGroup}`;

              return (
                <div
                  key={m.id}
                  className={`qr-print-card flex flex-col items-center justify-between rounded-[18px] border-2 border-dashed border-[#D6C1AA] bg-white text-center ${
                    isAll21 ? 'p-2 print:p-1.5' : 'p-3 print:p-2'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-1 text-base font-bold text-[#3B2F2A] print:text-sm">
                      <span>{m.emoji}</span>
                      <span className="truncate">{m.nickname}</span>
                    </div>
                    <div className="truncate text-[11px] text-[#705F56] print:text-[10px]">
                      {m.fullName}
                    </div>
                  </div>

                  <div className="my-1.5 flex items-center justify-center print:my-1">
                    {qrMap[m.id] ? (
                      <img
                        src={qrMap[m.id]}
                        alt={`QR ${m.nickname}`}
                        className={
                          isAll21
                            ? 'h-24 w-24 rounded-lg border border-[#EBD8C3] print:h-[78px] print:w-[78px]'
                            : 'h-28 w-28 rounded-xl border border-[#EBD8C3] print:h-[96px] print:w-[96px]'
                        }
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#FFFDF9] text-[10px] text-[#705F56]">
                        ...
                      </div>
                    )}
                  </div>

                  <div className="w-full text-[10px] font-semibold text-[#5C4B43]">
                    <span>
                      {roleText} · {m.id}
                    </span>
                    {showPin && (
                      <span className="ml-1.5 font-mono font-bold text-[#9F1239]">
                        PIN: {m.pin}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
