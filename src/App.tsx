import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Cloud, LogOut } from 'lucide-react';
import { CenteredAlertModal } from './components/CenteredAlertModal';
import { CreatorAdminView } from './components/CreatorAdminView';
import { CloudSyncState, MagicDoorView } from './components/MagicDoorView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { QrBadgeModal } from './components/QrBadgeModal';
import { QrPrintSheetModal } from './components/QrPrintSheetModal';
import { QrScannerModal } from './components/QrScannerModal';
import { StaffDashboardView } from './components/StaffDashboardView';
import { createDefaultState, UI_TEXT } from './data/seedData';
import { auth, googleProvider } from './firebase';
import {
  createMemberInCloud,
  createShopItemInCloud,
  deleteMemberInCloud,
  deleteShopItemInCloud,
  fulfillSnackBillInCloud,
  normalizeAllowedEmails,
  pullStateFromGoogleSheets,
  resolveSickReportInCloud,
  seedFoundationIfEmpty,
  subscribeToFoundationCloudSync,
  syncMemberAdminFieldsToCloud,
  syncMemberProgressToCloud,
  updateDoorCommandsInCloud,
  updateHolidayDateInCloud,
  updateSettingsAndAllowlistInCloud,
} from './services/firestoreSync';
import {
  AlertModalPayload,
  AppMode,
  BarnhemState,
  DoorCommandConfig,
  Language,
  Member,
} from './types/barnhem';
import {
  executeDoorCommand,
  resolveDoorCommands,
} from './utils/doorCommands';
import {
  buildMemberQrPayload,
  formatDateStr,
  formatTimeHMS,
  getMemberDailySafe,
  resolveUnifiedLogin,
  syncToGoogleSheets,
} from './utils/rules';
import { resetKidDailyCommands } from './utils/quickCheckin';
import {
  clearKidPenalties,
  clearKidStars,
  grantStarsByStaff,
  STAFF_MAX_STARS_PER_DAY,
} from './utils/staffStars';
import {
  getPastelFrameTheme,
  loadSavedPortalFrameId,
  PastelFrameId,
  savePortalFrameId,
} from './utils/pastelFrames';

const STORAGE_KEY = 'barnhem_super_app_v1';

const ROLE_ORDER: Record<Member['role'], number> = {
  manager: 0,
  staff: 1,
  kid: 2,
};

function sortMembersDeterministically(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    const rDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (rDiff !== 0) return rDiff;
    if (a.role === 'kid' && b.role === 'kid') {
      const gDiff = (a.ageGroup || 1) - (b.ageGroup || 1);
      if (gDiff !== 0) return gDiff;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    }
    return a.id.localeCompare(b.id);
  });
}

function loadInitialState(): BarnhemState {
  const todayStr = formatDateStr(new Date());
  if (typeof window === 'undefined') {
    return createDefaultState(todayStr);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState(todayStr);
    const parsed = JSON.parse(raw) as BarnhemState;
    if (!parsed || !Array.isArray(parsed.members) || parsed.members.length === 0) {
      return createDefaultState(todayStr);
    }
    // Sync requested correction: s7 -> ฟ้า (🌤️) and s10 -> ฟา (🦋) without losing stars/history
    const migratedMembers = parsed.members.map((m) => {
      if (m.id === 's7' && m.nickname === 'ฟา') {
        return { ...m, nickname: 'ฟ้า', emoji: '🌤️' };
      }
      if (m.id === 's10' && m.emoji === '🐱') {
        return { ...m, nickname: 'ฟา', emoji: '🦋' };
      }
      return m;
    });
    return {
      ...parsed,
      members: migratedMembers,
      settings: {
        ...parsed.settings,
        allowedSyncEmails: normalizeAllowedEmails(parsed.settings?.allowedSyncEmails),
      },
    };
  } catch {
    return createDefaultState(todayStr);
  }
}

interface ActiveQrBadge {
  id: string;
  nickname: string;
  fullName: string;
  roleLabel: string;
  emoji?: string;
  payload: string;
}

export default function App() {
  const [state, setState] = useState<BarnhemState>(loadInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [mode, setMode] = useState<AppMode>('magic_door');
  const [lang, setLang] = useState<Language>('th');
  const [now, setNow] = useState<Date>(() => new Date());
  const [portalFrameId, setPortalFrameId] = useState<PastelFrameId>(() =>
    loadSavedPortalFrameId()
  );
  const portalTheme = getPastelFrameTheme(portalFrameId);

  const handlePortalFrameChange = (nextId: PastelFrameId) => {
    setPortalFrameId(nextId);
    savePortalFrameId(nextId);
  };

  const [loggedInStaff, setLoggedInStaff] = useState<Member | null>(null);
  const [loggedInManager, setLoggedInManager] = useState<Member | null>(null);
  const [isCreatorAuth, setIsCreatorAuth] = useState(false);

  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncState>('local');

  const [alertModal, setAlertModal] = useState<AlertModalPayload | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrPrintSheetOpen, setIsQrPrintSheetOpen] = useState(false);
  const [activeQrBadge, setActiveQrBadge] = useState<ActiveQrBadge | null>(null);

  // Real-time ticking clock (1s interval, never frozen)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync language attribute on <html>
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Persist to LocalStorage automatically
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const showAlert = useCallback((payload: Omit<AlertModalPayload, 'id'>) => {
    setAlertModal({ ...payload, id: `alert_${Date.now()}` });
  }, []);

  // Firebase Auth & Real-time Firestore Listeners
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      setCloudUser(user);

      if (!user || !user.email || !user.emailVerified) {
        setCloudSyncStatus('local');
        return;
      }

      const emailLower = user.email.trim().toLowerCase();
      setCloudSyncStatus('connecting');

      try {
        await seedFoundationIfEmpty(user.uid, emailLower, stateRef.current);

        unsubFirestore = subscribeToFoundationCloudSync(emailLower, {
          onMembers: (members) => {
            setCloudSyncStatus('synced');
            setState((prev) => ({
              ...prev,
              members: sortMembersDeterministically(members),
            }));
          },
          onShopItems: (shopItems) => {
            setCloudSyncStatus('synced');
            setState((prev) => ({ ...prev, shopItems }));
          },
          onSickReports: (sickReports) => {
            setState((prev) => ({ ...prev, sickReports }));
          },
          onSnackBills: (snackBills) => {
            setState((prev) => ({ ...prev, snackBills }));
          },
          onSettings: (settings) => {
            setCloudSyncStatus('synced');
            setState((prev) => ({ ...prev, settings }));
          },
          onPermissionDenied: () => {
            setCloudSyncStatus('unauthorized');
          },
        });
      } catch {
        setCloudSyncStatus('local');
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleConnectCloud = useCallback(async () => {
    try {
      setCloudSyncStatus('connecting');
      const cred = await signInWithPopup(auth, googleProvider);
      showAlert({
        icon: '☁️',
        title: lang === 'th' ? 'เชื่อมต่อ Cloud Sync สำเร็จ!' : 'Google Cloud Sync Connected!',
        message:
          lang === 'th'
            ? `เชื่อมต่อบัญชี ${cred.user.email} แล้ว ข้อมูลจะซิงก์ข้ามทุกเครื่องที่ได้รับอนุญาตแบบ Real-time ทันที`
            : `Signed in as ${cred.user.email}. Data now syncs across authorized devices in real time.`,
        tone: 'mint',
      });
    } catch (err) {
      setCloudSyncStatus('local');
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        showAlert({
          icon: '⚠️',
          title: lang === 'th' ? 'ไม่สามารถเชื่อมต่อ Google Sync' : 'Could Not Connect Google Sync',
          message: msg || (lang === 'th' ? 'กรุณาลองใหม่อีกครั้ง' : 'Please try again.'),
          tone: 'yellow',
        });
      }
    }
  }, [lang, showAlert]);

  const handleDisconnectCloud = useCallback(async () => {
    await signOut(auth);
    setCloudSyncStatus('local');
    showAlert({
      icon: '☁️',
      title: lang === 'th' ? 'ออกจาก Google Cloud Sync แล้ว' : 'Disconnected Google Cloud Sync',
      message:
        lang === 'th'
          ? 'กลับสู่โหมดบันทึกข้อมูลบนเครื่องนี้แล้ว'
          : 'Switched back to local device storage.',
      tone: 'blue',
    });
  }, [lang, showAlert]);

  const commitStateChange = useCallback(
    (updater: (prev: BarnhemState) => BarnhemState, actionName: string) => {
      setState((prev) => {
        const next = updater(prev);
        void syncToGoogleSheets(next, actionName);
        return next;
      });
    },
    []
  );

  const runCloudTask = useCallback(
    (task: () => Promise<void>) => {
      if (!cloudUser || !cloudUser.emailVerified || cloudSyncStatus === 'unauthorized') return;
      void task().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        showAlert({
          icon: '☁️',
          title: lang === 'th' ? 'ไม่สามารถซิงก์รายการนี้ขึ้น Cloud' : 'Cloud Sync Notice',
          message: msg.slice(0, 220),
          tone: 'yellow',
        });
      });
    },
    [cloudSyncStatus, cloudUser, lang, showAlert]
  );

  const todayStr = formatDateStr(now);
  const isHolidayToday = state.settings.holidayDate === todayStr;
  const t = UI_TEXT[lang];

  const kids = state.members
    .filter((m) => m.role === 'kid')
    .map((m) => getMemberDailySafe(m, todayStr));
  const staffMembers = state.members.filter((m) => m.role === 'staff');
  const managerMembers = state.members.filter((m) => m.role === 'manager');
  const doorCommands = resolveDoorCommands(state.settings.doorCommands, state.members);
  const liveLoggedInStaff = loggedInStaff
    ? getMemberDailySafe(
        state.members.find((m) => m.id === loggedInStaff.id) ?? loggedInStaff,
        todayStr
      )
    : null;

  const isSignedIn = Boolean(
    (mode === 'staff' && liveLoggedInStaff) ||
      (mode === 'manager' && loggedInManager) ||
      (mode === 'creator' && isCreatorAuth)
  );

  const handleSignOut = useCallback(() => {
    setLoggedInStaff(null);
    setLoggedInManager(null);
    setIsCreatorAuth(false);
    setMode('magic_door');
  }, []);

  const handleManagerLogin = useCallback(
    (manager: Member) => {
      setLoggedInManager(manager);
      if (manager.pin === '9015' || manager.id === 'mgr_susan') {
        setLang('en');
        showAlert({
          icon: '🇬🇧',
          title: 'Welcome SuSan!',
          message: 'Signed in as Foundation Manager. Interface automatically switched to English.',
          tone: 'blue',
        });
      } else {
        setLang('th');
        showAlert({
          icon: '🌟',
          title: `ยินดีต้อนรับ ${manager.nickname}`,
          message: 'เข้าสู่โหมดผู้จัดการมูลนิธิเรียบร้อยแล้ว',
          tone: 'mint',
        });
      }
    },
    [showAlert]
  );

  const handleUnifiedLogin = useCallback(
    (rawInput: string) => {
      const res = resolveUnifiedLogin(rawInput, state.members, state.settings.creatorPins);
      if (res.type === 'kid_blocked') {
        showAlert({
          icon: '🔑',
          title:
            lang === 'th'
              ? 'สงวนสิทธิ์ระบบหลังบ้านสำหรับพนักงานเท่านั้น'
              : 'Back-Office Reserved for Staff Only',
          message:
            lang === 'th'
              ? `ไม่มีหน้าโปรไฟล์ของเด็กแล้วค่ะ · น้อง ${res.member.nickname} สามารถกดทำรายการผ่าน "ปุ่มคำสั่งประจำวันหน้าประตู" ด้านล่างได้เลย`
              : `Child profile pages have been removed. ${res.member.nickname} can participate directly via the Daily Door Command buttons below.`,
          tone: 'yellow',
        });
        return;
      }

      if (res.type === 'not_found') {
        showAlert({
          icon: '🔍',
          title: lang === 'th' ? 'ไม่พบรหัสพนักงานหรือ QR นี้' : 'Invalid Staff PIN or QR Code',
          message:
            lang === 'th'
              ? 'กรุณาตรวจสอบรหัส PIN พนักงาน/ผู้ดูแล 4 หลัก หรือสแกนบัตร QR พนักงานอีกครั้ง'
              : 'No matching staff/admin account found. Please check your 4-digit PIN or Staff QR badge.',
          tone: 'yellow',
        });
        return;
      }

      setLoggedInStaff(null);
      setLoggedInManager(null);
      setIsCreatorAuth(false);

      if (res.type === 'staff') {
        setLoggedInStaff(res.member);
        setMode('staff');
        showAlert({
          icon: '🧑‍🏫',
          title: lang === 'th' ? `ยินดีต้อนรับ ${res.member.nickname}` : `Welcome ${res.member.nickname}`,
          message: lang === 'th' ? 'เข้าสู่โหมดพี่เลี้ยงเรียบร้อยแล้ว' : 'Signed in to Staff Mode.',
          tone: 'mint',
        });
        return;
      }

      if (res.type === 'manager') {
        setMode('manager');
        handleManagerLogin(res.member);
        return;
      }

      if (res.type === 'creator') {
        setIsCreatorAuth(true);
        setMode('creator');
        showAlert({
          icon: '👑',
          title:
            lang === 'th' ? 'ยินดีต้อนรับ Creator พี่กิ๊ก / Chali' : 'Welcome Creator (Kik / Chali)',
          message:
            lang === 'th' ? 'เข้าสู่โหมดผู้สร้างสูงสุดเรียบร้อยแล้ว' : 'Signed in to Creator Master Admin.',
          tone: 'lavender',
        });
      }
    },
    [handleManagerLogin, lang, showAlert, state.members, state.settings.creatorPins]
  );

  const handleOpenMemberQr = useCallback(
    (memberOrId: Member | string) => {
      const member =
        typeof memberOrId === 'string'
          ? state.members.find((m) => m.id === memberOrId)
          : memberOrId;
      if (!member) return;

      const roleLabel =
        member.role === 'manager'
          ? lang === 'th'
            ? 'ผู้จัดการมูลนิธิ'
            : 'Foundation Manager'
          : member.role === 'staff'
            ? lang === 'th'
              ? 'พี่เลี้ยง'
              : 'Staff'
            : lang === 'th'
              ? `น้องกลุ่ม ${member.ageGroup}`
              : `Child · Group ${member.ageGroup}`;

      setActiveQrBadge({
        id: member.id,
        nickname: member.nickname,
        fullName: member.fullName,
        roleLabel,
        emoji: member.emoji,
        payload: buildMemberQrPayload(member),
      });
    },
    [lang, state.members]
  );

  const allowedEmails = normalizeAllowedEmails(state.settings.allowedSyncEmails);

  const handleUpdateKid = (updatedKid: Member, actionName: string) => {
    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === updatedKid.id ? updatedKid : m)),
      }),
      actionName
    );
    if (cloudUser) {
      if (actionName.includes('personalDriveUrl') || actionName.includes('restrictedDocsUrl')) {
        runCloudTask(() => syncMemberAdminFieldsToCloud(updatedKid, cloudUser.uid));
      } else {
        runCloudTask(() => syncMemberProgressToCloud(updatedKid, cloudUser.uid));
      }
    }
  };

  const handleGrantStarsByStaff = (
    kid: Member,
    amount: number,
    reason: string
  ): { ok: boolean } => {
    if (!liveLoggedInStaff) return { ok: false };
    const result = grantStarsByStaff({
      staff: liveLoggedInStaff,
      kid,
      amount,
      reason,
      now,
    });

    if (!result.ok || !result.updatedKid || !result.updatedStaff) {
      showAlert({
        icon: '⚠️',
        title: result.errorTitleTh || 'ไม่สามารถให้ดาวได้',
        message: result.errorMessageTh || 'กรุณาตรวจสอบจำนวนดาวและโควตาวันนี้',
        tone: 'yellow',
      });
      return { ok: false };
    }

    const nextKid = result.updatedKid;
    const nextStaff = result.updatedStaff;

    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) => {
          if (m.id === nextKid.id) return nextKid;
          if (m.id === nextStaff.id) return nextStaff;
          return m;
        }),
      }),
      `staff_grant_stars_${nextKid.id}_${amount}`
    );

    if (cloudUser) {
      runCloudTask(async () => {
        await Promise.all([
          syncMemberProgressToCloud(nextKid, cloudUser.uid),
          syncMemberProgressToCloud(nextStaff, cloudUser.uid),
        ]);
      });
    }

    showAlert({
      icon: '⭐',
      title: `มอบ +${amount} ⭐ ให้ ${nextKid.nickname} แล้ว`,
      message: `ยอดดาวล่าสุดของ ${nextKid.nickname}: ${nextKid.stars.toLocaleString()} ⭐ · โควตา ${nextStaff.nickname} วันนี้เหลือ ${result.remainingToday}/${STAFF_MAX_STARS_PER_DAY} ⭐`,
      tone: 'mint',
    });

    return { ok: true };
  };

  const handleDeleteKid = (kidId: string) => {
    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== kidId),
      }),
      `creator_delete_kid_${kidId}`
    );
    if (cloudUser) {
      runCloudTask(() => deleteMemberInCloud(kidId));
    }
    showAlert({
      icon: '🗑️',
      title: 'ลบรายชื่อเรียบร้อย',
      message: `ลบสมาชิก ${kidId} ออกจากระบบแล้ว`,
      tone: 'peach',
    });
  };

  const handleClearAllKidsStars = () => {
    const updatedKids = state.members
      .filter((m) => m.role === 'kid')
      .map((k) => clearKidStars(k, now));
    const mapById = new Map(updatedKids.map((k) => [k.id, k]));

    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) => mapById.get(m.id) ?? m),
      }),
      'creator_clear_all_kids_stars'
    );
    if (cloudUser) {
      runCloudTask(async () => {
        await Promise.all(updatedKids.map((k) => syncMemberProgressToCloud(k, cloudUser.uid)));
      });
    }
  };

  const handleClearAllKidsPenalties = () => {
    const updatedKids = state.members
      .filter((m) => m.role === 'kid')
      .map((k) => clearKidPenalties(getMemberDailySafe(k, todayStr)));
    const mapById = new Map(updatedKids.map((k) => [k.id, k]));

    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) => mapById.get(m.id) ?? m),
      }),
      'creator_clear_all_kids_penalties'
    );
    if (cloudUser) {
      runCloudTask(async () => {
        await Promise.all(updatedKids.map((k) => syncMemberProgressToCloud(k, cloudUser.uid)));
      });
    }
  };

  const handleSaveDoorCommands = (commands: DoorCommandConfig[], actionName: string) => {
    commitStateChange(
      (prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          doorCommands: commands,
        },
      }),
      actionName
    );
    if (cloudUser) {
      runCloudTask(() => updateDoorCommandsInCloud(commands, cloudUser.uid));
    }
  };

  const handleExecuteDoorCommand = ({
    cmd,
    kid,
    kidPinInput,
    staffPinInput,
    penaltyReasonInput,
  }: {
    cmd: DoorCommandConfig;
    kid: Member;
    kidPinInput: string;
    staffPinInput: string;
    penaltyReasonInput?: string;
  }) => {
    const result = executeDoorCommand({
      cmd,
      kid,
      kidPinInput,
      staffPinInput,
      penaltyReasonOverride: penaltyReasonInput,
      staffMembers,
      creatorPins: state.settings.creatorPins,
      now,
      isHolidayToday,
    });
    if (result.ok) {
      handleUpdateKid(result.updatedMember, `door_cmd_${cmd.id}_${kid.id}`);
    }
    showAlert({
      icon: result.ok ? cmd.emoji : '🔒',
      title: result.titleTh,
      message: result.messageTh,
      tone: result.tone,
    });
    return { ok: result.ok };
  };

  const handleResetAllDailyCommands = () => {
    const targetKids = state.members.filter((m) => m.role === 'kid');
    const resetKids = targetKids.map((k) => resetKidDailyCommands(k, todayStr));
    commitStateChange(
      (prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.role === 'kid' ? resetKidDailyCommands(m, todayStr) : m
        ),
      }),
      'staff_reset_all_daily_commands'
    );
    if (cloudUser) {
      runCloudTask(async () => {
        await Promise.all(resetKids.map((k) => syncMemberProgressToCloud(k, cloudUser.uid)));
      });
    }
  };

  const handleToggleHolidayToday = () => {
    const nextHolidayDate = isHolidayToday ? '' : todayStr;
    commitStateChange(
      (prev) => ({
        ...prev,
        settings: { ...prev.settings, holidayDate: nextHolidayDate },
      }),
      nextHolidayDate ? 'staff_enable_holiday_mode' : 'staff_disable_holiday_mode'
    );
    if (cloudUser) {
      runCloudTask(() => updateHolidayDateInCloud(nextHolidayDate, cloudUser.uid));
    }
    showAlert({
      icon: nextHolidayDate ? '🏖️' : '🏫',
      title: nextHolidayDate
        ? lang === 'th'
          ? 'เปิดโหมดวันหยุด / ปิดเทอมวันนี้แล้ว'
          : 'Holiday Mode Enabled for Today'
        : lang === 'th'
          ? 'ปิดโหมดวันหยุด (กลับสู่ตารางปกติ)'
          : 'Returned to Regular School Schedule',
      message: nextHolidayDate
        ? lang === 'th'
          ? 'ระบบยกเว้นเวลาสายกะเช้าและค่าปรับมาสายของวันนี้ให้น้องๆ กลุ่ม 1 และกลุ่ม 2 แล้วค่ะ'
          : 'Morning school tardiness and fines are waived for today.'
        : lang === 'th'
          ? 'กลับมาใช้เวลาเข้าเรียนและกติกาปกติเรียบร้อยแล้ว'
          : 'Regular school schedule and check-in rules restored.',
      tone: nextHolidayDate ? 'mint' : 'blue',
    });
  };


  const handleResolveSick = (reportId: string, kidId: string) => {
    const targetKid = kids.find((k) => k.id === kidId);
    const updatedKid = targetKid
      ? {
          ...targetKid,
          dailyProgress: { ...targetKid.dailyProgress, dateStr: todayStr, isSickToday: false },
        }
      : null;

    commitStateChange(
      (prev) => ({
        ...prev,
        sickReports: prev.sickReports.map((r) =>
          r.id === reportId ? { ...r, resolved: true } : r
        ),
        members: prev.members.map((m) =>
          m.id === kidId
            ? {
                ...m,
                dailyProgress: { ...m.dailyProgress, dateStr: todayStr, isSickToday: false },
              }
            : m
        ),
      }),
      'staff_resolve_sick'
    );

    if (cloudUser) {
      runCloudTask(async () => {
        await resolveSickReportInCloud(reportId, cloudUser.uid);
        if (updatedKid) {
          await syncMemberProgressToCloud(updatedKid, cloudUser.uid);
        }
      });
    }

    showAlert({
      icon: '💚',
      title: lang === 'th' ? 'ปิดเคสอาการป่วยแล้ว!' : 'Health Case Closed!',
      message: lang === 'th' ? 'ยินดีด้วย น้องหายป่วยแข็งแรงแล้ว' : 'Marked as recovered.',
      tone: 'mint',
    });
  };

  const handlePullFromSheets = async () => {
    try {
      const pulled = await pullStateFromGoogleSheets(state.settings.googleSheetsUrl);
      if (!pulled) {
        showAlert({
          icon: '📄',
          title: 'ยังไม่พบข้อมูลจาก Google Sheets',
          message:
            'ตรวจสอบว่าใน Google Apps Script ของคุณมีฟังก์ชัน doGet(e) และมีการบันทึกข้อมูลไว้ในแผ่นงาน BarnhemSync แล้ว',
          tone: 'yellow',
        });
        return;
      }
      setState(pulled);
      showAlert({
        icon: '☁️',
        title: 'ดึงข้อมูลจาก Google Sheets สำเร็จ ✓',
        message: `นำเข้าข้อมูลสมาชิก ${pulled.members.length} คน และร้านค้า ${pulled.shopItems.length} รายการเรียบร้อย`,
        tone: 'mint',
      });
    } catch {
      showAlert({
        icon: '⚠️',
        title: 'ดึงข้อมูลจาก Google Sheets ไม่สำเร็จ',
        message:
          'Apps Script URL ปัจจุบันอาจยังไม่ได้เพิ่มฟังก์ชัน doGet(e) หรือยังไม่ได้ตั้งค่า Allow Anyone (ดูตัวอย่างโค้ด 2-Way ในหน้าตั้งค่าได้เลยค่ะ)',
        tone: 'yellow',
      });
    }
  };

  const signedInBadgeLabel = loggedInStaff
    ? `🧑‍🏫 ${loggedInStaff.nickname}`
    : loggedInManager
      ? `📊 ${loggedInManager.nickname}`
      : isCreatorAuth
        ? '👑 Creator'
        : '';

  return (
    <div className="min-h-screen pb-12">
      {/* Compact Privacy-First Header */}
      <header
        className="no-print z-30 border-b-2 bg-[#FFFEFC]/95 backdrop-blur-md transition-colors duration-200 md:sticky md:top-0"
        style={{ borderColor: portalTheme.innerBorder }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="whitespace-nowrap text-base font-bold tracking-tight text-[#3B2F2A] sm:text-lg">
              🏡 <span className="sm:hidden">Barnhem</span>
              <span className="hidden sm:inline">{t.appName}</span>
            </span>
            {isSignedIn && signedInBadgeLabel && (
              <span className="hidden rounded-full border border-[#EBD8C3] bg-[#FAF4EC] px-3 py-0.5 text-xs font-bold text-[#3B2F2A] sm:inline-block">
                {signedInBadgeLabel}
              </span>
            )}
            {cloudSyncStatus === 'synced' && (
              <span className="hidden items-center gap-1 rounded-full bg-[#D4F0F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0F766E] sm:inline-flex">
                <Cloud className="h-3 w-3" /> Cloud Sync ✓
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSignedIn && (
              <button
                type="button"
                onClick={handleSignOut}
                className="pastel-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-[14px] border-2 border-[#F0A8B2] bg-[#FADADD]/60 px-3 py-1 text-xs font-bold text-[#9F1239] sm:text-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t.logoutBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'th' ? 'en' : 'th'))}
              className="pastel-btn min-h-[38px] rounded-[14px] border-2 border-[#EBD8C3] bg-[#FFF5BA] px-3.5 py-1 text-xs font-bold text-[#3B2F2A] whitespace-nowrap sm:text-sm"
            >
              {t.langSwitch}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="no-print mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {!isSignedIn && (
          <MagicDoorView
            lang={lang}
            now={now}
            kids={kids}
            doorCommands={doorCommands}
            isHolidayToday={isHolidayToday}
            cloudSyncStatus={cloudSyncStatus}
            cloudUserEmail={cloudUser?.email}
            frameId={portalFrameId}
            onChangeFrame={handlePortalFrameChange}
            onUnifiedLogin={handleUnifiedLogin}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onExecuteDoorCommand={handleExecuteDoorCommand}
            onShowAlert={showAlert}
            onConnectCloud={handleConnectCloud}
            onDisconnectCloud={handleDisconnectCloud}
          />
        )}

        {mode === 'staff' && liveLoggedInStaff && (
          <StaffDashboardView
            lang={lang}
            now={now}
            loggedInStaff={liveLoggedInStaff}
            staffMembers={staffMembers}
            kids={kids}
            sickReports={state.sickReports}
            snackBills={state.snackBills}
            doorCommands={doorCommands}
            isHolidayToday={isHolidayToday}
            cloudSyncStatus={cloudSyncStatus}
            onToggleHolidayToday={handleToggleHolidayToday}
            onConnectCloud={handleConnectCloud}
            onLogin={setLoggedInStaff}
            onLogout={handleSignOut}
            onResolveSick={handleResolveSick}
            onGrantStarsByStaff={handleGrantStarsByStaff}
            onSaveDoorCommands={handleSaveDoorCommands}
            onResetAllDailyCommands={handleResetAllDailyCommands}
            onAddKid={(newKid) => {
              commitStateChange(
                (prev) => ({ ...prev, members: [...prev.members, newKid] }),
                `staff_add_kid_${newKid.id}`
              );
              if (cloudUser) {
                runCloudTask(() => createMemberInCloud(newKid, cloudUser.uid, allowedEmails));
              }
              showAlert({
                icon: '🎉',
                title: `เพิ่มน้อง "${newKid.nickname}" สำเร็จ`,
                message: `เพิ่ม ${newKid.fullName} (รหัส ${newKid.id}) เข้าระบบเรียบร้อยแล้ว`,
                tone: 'mint',
              });
            }}
            onFulfillBill={(billId) => {
              commitStateChange(
                (prev) => ({
                  ...prev,
                  snackBills: prev.snackBills.map((b) =>
                    b.id === billId ? { ...b, fulfilled: true } : b
                  ),
                }),
                `staff_fulfill_bill_${billId}`
              );
              if (cloudUser) {
                runCloudTask(() => fulfillSnackBillInCloud(billId, cloudUser.uid));
              }
            }}
            onShowAlert={showAlert}
          />
        )}

        {mode === 'manager' && loggedInManager && (
          <ManagerDashboardView
            lang={lang}
            now={now}
            loggedInManager={loggedInManager}
            managerMembers={managerMembers}
            kids={kids}
            sickReports={state.sickReports}
            onLogin={handleManagerLogin}
            onLogout={handleSignOut}
            onShowAlert={showAlert}
          />
        )}

        {mode === 'creator' && isCreatorAuth && (
          <CreatorAdminView
            lang={lang}
            now={now}
            isAuthenticated={isCreatorAuth}
            state={state}
            kids={kids}
            onLogin={(pin) => {
              const ok = state.settings.creatorPins.includes(pin);
              if (ok) setIsCreatorAuth(true);
              return ok;
            }}
            onLogout={handleSignOut}
            onUpdateKid={handleUpdateKid}
            onDeleteKid={handleDeleteKid}
            onClearAllKidsStars={handleClearAllKidsStars}
            onClearAllKidsPenalties={handleClearAllKidsPenalties}
            onAddShopItem={(item) => {
              commitStateChange(
                (prev) => ({ ...prev, shopItems: [item, ...prev.shopItems] }),
                `creator_add_item_${item.id}`
              );
              if (cloudUser) {
                runCloudTask(() => createShopItemInCloud(item, cloudUser.uid, allowedEmails));
              }
              showAlert({
                icon: item.emoji,
                title: 'เพิ่มสินค้าใหม่สำเร็จ!',
                message: `เพิ่ม "${item.name}" ราคา ${item.priceStars} ⭐ เข้าร้านค้าแล้ว`,
                tone: 'mint',
              });
            }}
            onDeleteShopItem={(itemId) => {
              commitStateChange(
                (prev) => ({
                  ...prev,
                  shopItems: prev.shopItems.filter((s) => s.id !== itemId),
                }),
                `creator_delete_item_${itemId}`
              );
              if (cloudUser) {
                runCloudTask(() => deleteShopItemInCloud(itemId));
              }
            }}
            onUpdateSettings={(creatorPins, googleSheetsUrl, allowedSyncEmails) => {
              const nextSettings = {
                ...state.settings,
                creatorPins,
                googleSheetsUrl,
                allowedSyncEmails,
              };
              commitStateChange(
                (prev) => ({
                  ...prev,
                  settings: nextSettings,
                }),
                'creator_update_settings'
              );
              if (cloudUser && cloudUser.email) {
                const email = cloudUser.email;
                runCloudTask(() => updateSettingsAndAllowlistInCloud(nextSettings, cloudUser.uid, email));
              }
              showAlert({
                icon: '⚙️',
                title: 'บันทึกการตั้งค่าแล้ว ✓',
                message: 'อัปเดตรหัส PIN, Google Sheets URL และรายชื่ออีเมล Cloud Sync เรียบร้อย',
                tone: 'mint',
              });
            }}
            doorCommands={doorCommands}
            onSaveDoorCommands={handleSaveDoorCommands}
            onManualSync={() => {
              void syncToGoogleSheets(state, 'creator_manual_sync');
              showAlert({
                icon: '☁️',
                title: 'ส่งข้อมูลไป Google Sheets แล้ว ✓',
                message: `ส่งข้อมูล JSON (POST) ไปยัง\n${state.settings.googleSheetsUrl}`,
                tone: 'blue',
              });
            }}
            onPullFromSheets={handlePullFromSheets}
            onShowMemberQr={handleOpenMemberQr}
            onOpenQrPrintSheet={() => setIsQrPrintSheetOpen(true)}
            onShowAlert={showAlert}
          />
        )}
      </main>

      {/* Camera & Photo-Upload QR Scanner */}
      <QrScannerModal
        lang={lang}
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanResult={handleUnifiedLogin}
      />

      {/* Printable Single Member QR Badge */}
      <QrBadgeModal
        lang={lang}
        badge={activeQrBadge}
        onClose={() => setActiveQrBadge(null)}
      />

      {/* Single-Page All-in-One Printable QR Sheet */}
      <QrPrintSheetModal
        lang={lang}
        isOpen={isQrPrintSheetOpen}
        members={state.members}
        onClose={() => setIsQrPrintSheetOpen(false)}
      />

      {/* Mandatory Centered Modal Alert */}
      <CenteredAlertModal alert={alertModal} lang={lang} onClose={() => setAlertModal(null)} />
    </div>
  );
}
