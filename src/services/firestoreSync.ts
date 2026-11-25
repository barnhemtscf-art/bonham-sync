import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BOOTSTRAP_ADMIN_EMAIL, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppSettings,
  BarnhemState,
  DoorCommandConfig,
  Member,
  ShopItem,
  SickReport,
  SnackBill,
} from '../types/barnhem';
import { getSafePiggyBank } from '../utils/piggyBank';

export function normalizeAllowedEmails(emails?: string[]): string[] {
  const set = new Set<string>([BOOTSTRAP_ADMIN_EMAIL]);
  if (Array.isArray(emails)) {
    for (const raw of emails) {
      const cleaned = raw.trim().toLowerCase();
      if (cleaned && cleaned.includes('@') && cleaned.length <= 120) {
        set.add(cleaned);
      }
      if (set.size >= 30) break;
    }
  }
  return Array.from(set);
}

function clampString(val: string | undefined, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}

export function sanitizeDoorCommandsForFirestore(cmds?: DoorCommandConfig[]): DoorCommandConfig[] {
  if (!Array.isArray(cmds)) return [];
  return cmds.slice(0, 30).map((c, idx) => ({
    id: clampString(c.id, 64) || `cmd_${idx}`,
    commandKind: c.commandKind === 'penalty' ? ('penalty' as const) : ('routine' as const),
    titleTh: clampString(c.titleTh, 80) || 'คำสั่ง',
    descriptionTh: clampString(c.descriptionTh, 200),
    emoji: clampString(c.emoji, 16) || '✨',
    startTime: clampString(c.startTime, 5) || '06:00',
    endTime: clampString(c.endTime, 5) || '23:00',
    earlyMinutes: Math.max(0, Math.min(180, Math.round(Number(c.earlyMinutes) || 0))),
    deadlineTime: clampString(c.deadlineTime, 5) || '21:00',
    authMode:
      c.authMode === 'kid_pin' || c.authMode === 'staff_pin' ? c.authMode : ('direct' as const),
    rewardStars: Math.max(0, Math.min(1000, Math.round(Number(c.rewardStars) || 0))),
    penaltyType: (c.penaltyType || 'none') as DoorCommandConfig['penaltyType'],
    penaltyValue: Math.max(0, Math.min(1000, Math.round(Number(c.penaltyValue) || 0))),
    penaltyNoteTh: clampString(c.penaltyNoteTh, 200),
    ...(c.customPenaltyLabelTh
      ? { customPenaltyLabelTh: clampString(c.customPenaltyLabelTh, 120) }
      : {}),
    allowedKidIds: Array.isArray(c.allowedKidIds)
      ? c.allowedKidIds.slice(0, 50).map((id) => clampString(id, 64)).filter(Boolean)
      : [],
    enabled: Boolean(c.enabled),
  }));
}

function sanitizePiggyBankForFirestore(member: Member) {
  const safe = getSafePiggyBank(member);
  return {
    savedStars: Math.max(0, Math.min(1000000, Math.round(safe.savedStars))),
    goalStars: Math.max(1, Math.min(1000000, Math.round(safe.goalStars))),
    goalLabel: clampString(safe.goalLabel, 80) || 'เป้าหมายพิเศษของฉัน',
    isHidden: Boolean(safe.isHidden),
    streakDays: Math.max(0, Math.min(3650, Math.round(safe.streakDays))),
    lastDepositDateStr: clampString(safe.lastDepositDateStr, 10),
    transactions: safe.transactions.slice(0, 30).map((t) => ({
      id: clampString(t.id, 60) || `piggy_${Date.now()}`,
      dateStr: clampString(t.dateStr, 10),
      timestamp: clampString(t.timestamp, 20),
      type: t.type === 'withdraw' ? 'withdraw' : 'deposit',
      amount: Math.max(1, Math.min(1000000, Math.round(Number(t.amount) || 1))),
      note: clampString(t.note, 100),
    })),
  };
}

export function buildMemberCreateDoc(member: Member, uid: string, allowedEmails: string[]) {
  const docData: Record<string, unknown> = {
    id: member.id.slice(0, 64),
    role: member.role,
    nickname: clampString(member.nickname, 60) || 'Member',
    fullName: clampString(member.fullName, 140) || member.nickname,
    gender: member.gender,
    pin: clampString(member.pin, 8) || '0000',
    stars: Math.max(0, Math.min(1000000, Number(member.stars) || 0)),
    lateFineThb: Math.max(0, Math.min(100000, Number(member.lateFineThb) || 0)),
    freeDayPenaltyCount: Math.max(0, Math.min(1000, Number(member.freeDayPenaltyCount) || 0)),
    phoneBlockedReason: clampString(member.phoneBlockedReason, 300),
    cartoonUnlockedToday: Boolean(member.cartoonUnlockedToday),
    kitchenDutyToday: Boolean(member.kitchenDutyToday),
    personalDriveUrl: clampString(member.personalDriveUrl, 500),
    restrictedDocsUrl: clampString(member.restrictedDocsUrl, 500),
    mySpace: {
      favoriteColor: clampString(member.mySpace?.favoriteColor, 80),
      favoriteFood: clampString(member.mySpace?.favoriteFood, 80),
      favoritePet: clampString(member.mySpace?.favoritePet, 80),
      futureDream: clampString(member.mySpace?.futureDream, 200),
    },
    selectedCoverIndex: Math.max(0, Math.min(6, Number(member.selectedCoverIndex) || 0)),
    unlockedCovers:
      Array.isArray(member.unlockedCovers) && member.unlockedCovers.length > 0
        ? member.unlockedCovers.slice(0, 7)
        : [0],
    ownedShopItemIds: Array.isArray(member.ownedShopItemIds)
      ? member.ownedShopItemIds.slice(0, 200)
      : [],
    equippedOutfitId: clampString(member.equippedOutfitId, 80),
    equippedAccessoryIds: Array.isArray(member.equippedAccessoryIds)
      ? member.equippedAccessoryIds.slice(0, 20)
      : [],
    collectedLocationItemIds: Array.isArray(member.collectedLocationItemIds)
      ? member.collectedLocationItemIds.slice(0, 100)
      : [],
    dailyProgress: {
      ...(member.dailyProgress || {}),
      dateStr: clampString(member.dailyProgress?.dateStr, 10) || new Date().toISOString().slice(0, 10),
      completedCommandIds: Array.isArray(member.dailyProgress?.completedCommandIds)
        ? member.dailyProgress.completedCommandIds.slice(0, 50).map((s) => clampString(s, 64))
        : [],
      ...(typeof member.dailyProgress?.staffStarsGivenToday === 'number'
        ? {
            staffStarsGivenToday: Math.max(
              0,
              Math.min(1000, Math.round(member.dailyProgress.staffStarsGivenToday))
            ),
          }
        : {}),
    },
    penalties: Array.isArray(member.penalties) ? member.penalties.slice(0, 100) : [],
    starHistory: Array.isArray(member.starHistory) ? member.starHistory.slice(0, 100) : [],
    piggyBank: sanitizePiggyBankForFirestore(member),
    allowedEmails: normalizeAllowedEmails(allowedEmails),
    ownerUid: uid,
    updatedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (member.emoji) docData.emoji = clampString(member.emoji, 16);
  if (member.ageGroup) docData.ageGroup = member.ageGroup;
  if (member.customCoverImageBase64 && member.customCoverImageBase64.length <= 140000) {
    docData.customCoverImageBase64 = member.customCoverImageBase64;
  } else {
    docData.customCoverImageBase64 = '';
  }
  return docData;
}

export function buildMemberProgressUpdateDoc(member: Member, uid: string) {
  return {
    stars: Math.max(0, Math.min(1000000, Number(member.stars) || 0)),
    lateFineThb: Math.max(0, Math.min(100000, Number(member.lateFineThb) || 0)),
    freeDayPenaltyCount: Math.max(0, Math.min(1000, Number(member.freeDayPenaltyCount) || 0)),
    phoneBlockedReason: clampString(member.phoneBlockedReason, 300),
    cartoonUnlockedToday: Boolean(member.cartoonUnlockedToday),
    kitchenDutyToday: Boolean(member.kitchenDutyToday),
    mySpace: {
      favoriteColor: clampString(member.mySpace?.favoriteColor, 80),
      favoriteFood: clampString(member.mySpace?.favoriteFood, 80),
      favoritePet: clampString(member.mySpace?.favoritePet, 80),
      futureDream: clampString(member.mySpace?.futureDream, 200),
    },
    selectedCoverIndex: Math.max(0, Math.min(6, Number(member.selectedCoverIndex) || 0)),
    unlockedCovers:
      Array.isArray(member.unlockedCovers) && member.unlockedCovers.length > 0
        ? member.unlockedCovers.slice(0, 7)
        : [0],
    customCoverImageBase64:
      member.customCoverImageBase64 && member.customCoverImageBase64.length <= 140000
        ? member.customCoverImageBase64
        : '',
    ownedShopItemIds: Array.isArray(member.ownedShopItemIds)
      ? member.ownedShopItemIds.slice(0, 200)
      : [],
    equippedOutfitId: clampString(member.equippedOutfitId, 80),
    equippedAccessoryIds: Array.isArray(member.equippedAccessoryIds)
      ? member.equippedAccessoryIds.slice(0, 20)
      : [],
    collectedLocationItemIds: Array.isArray(member.collectedLocationItemIds)
      ? member.collectedLocationItemIds.slice(0, 100)
      : [],
    dailyProgress: {
      ...(member.dailyProgress || {}),
      dateStr: clampString(member.dailyProgress?.dateStr, 10) || new Date().toISOString().slice(0, 10),
      completedCommandIds: Array.isArray(member.dailyProgress?.completedCommandIds)
        ? member.dailyProgress.completedCommandIds.slice(0, 50).map((s) => clampString(s, 64))
        : [],
      ...(typeof member.dailyProgress?.staffStarsGivenToday === 'number'
        ? {
            staffStarsGivenToday: Math.max(
              0,
              Math.min(1000, Math.round(member.dailyProgress.staffStarsGivenToday))
            ),
          }
        : {}),
    },
    penalties: Array.isArray(member.penalties) ? member.penalties.slice(0, 100) : [],
    starHistory: Array.isArray(member.starHistory) ? member.starHistory.slice(0, 100) : [],
    piggyBank: sanitizePiggyBankForFirestore(member),
    updatedByUid: uid,
    updatedAt: serverTimestamp(),
  };
}

export function buildShopItemCreateDoc(item: ShopItem, uid: string, allowedEmails: string[]) {
  const data: Record<string, unknown> = {
    id: item.id.slice(0, 80),
    name: clampString(item.name, 140) || 'Item',
    nameEn: clampString(item.nameEn || item.name, 140) || 'Item',
    priceStars: Math.max(1, Math.min(100000, Number(item.priceStars) || 1)),
    category: item.category,
    emoji: clampString(item.emoji, 16) || '🎁',
    description: clampString(item.description, 400),
    allowedEmails: normalizeAllowedEmails(allowedEmails),
    ownerUid: uid,
    updatedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (item.decorSlot) data.decorSlot = item.decorSlot;
  if (typeof item.locationIndex === 'number') data.locationIndex = item.locationIndex;
  if (item.imageBase64 && item.imageBase64.length <= 140000) data.imageBase64 = item.imageBase64;
  if (item.colorHex) data.colorHex = clampString(item.colorHex, 20);
  return data;
}

export function buildSickReportCreateDoc(report: SickReport, uid: string, allowedEmails: string[]) {
  return {
    id: report.id.slice(0, 80),
    kidId: report.kidId.slice(0, 64),
    kidNickname: clampString(report.kidNickname, 60) || 'Kid',
    symptom: clampString(report.symptom, 120) || 'Sick',
    details: clampString(report.details, 500),
    reportedAt: clampString(report.reportedAt, 30) || '08:00:00',
    dateStr: clampString(report.dateStr, 10) || new Date().toISOString().slice(0, 10),
    resolved: false,
    allowedEmails: normalizeAllowedEmails(allowedEmails),
    ownerUid: uid,
    updatedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildSnackBillCreateDoc(bill: SnackBill, uid: string, allowedEmails: string[]) {
  return {
    id: bill.id.slice(0, 80),
    kidId: bill.kidId.slice(0, 64),
    kidNickname: clampString(bill.kidNickname, 60) || 'Kid',
    itemId: bill.itemId.slice(0, 80),
    itemName: clampString(bill.itemName, 140) || 'Item',
    category: bill.category,
    priceStars: Math.max(1, Math.min(100000, Number(bill.priceStars) || 1)),
    createdAtLabel: clampString(bill.createdAt, 30) || '08:00:00',
    dateStr: clampString(bill.dateStr, 10) || new Date().toISOString().slice(0, 10),
    fulfilled: Boolean(bill.fulfilled),
    allowedEmails: normalizeAllowedEmails(allowedEmails),
    ownerUid: uid,
    updatedByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function seedFoundationIfEmpty(
  uid: string,
  userEmail: string,
  localState: BarnhemState
): Promise<boolean> {
  const settingsRef = doc(db, 'foundation_settings', 'main');
  try {
    const existingSettings = await getDoc(settingsRef);
    if (existingSettings.exists()) {
      return false;
    }
  } catch (err) {
    if (userEmail !== BOOTSTRAP_ADMIN_EMAIL) {
      return false;
    }
    handleFirestoreError(err, OperationType.GET, 'foundation_settings/main');
  }

  if (userEmail !== BOOTSTRAP_ADMIN_EMAIL) {
    return false;
  }

  const allowedEmails = normalizeAllowedEmails(localState.settings.allowedSyncEmails);
  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  ops.push({
    ref: settingsRef,
    data: {
      creatorPins: localState.settings.creatorPins.slice(0, 10),
      googleSheetsUrl: clampString(localState.settings.googleSheetsUrl, 500),
      allowedEmails,
      holidayDate: clampString(localState.settings.holidayDate, 10),
      doorCommands: sanitizeDoorCommandsForFirestore(localState.settings.doorCommands),
      ownerUid: uid,
      updatedByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  });

  for (const m of localState.members) {
    ops.push({
      ref: doc(db, 'members', m.id),
      data: buildMemberCreateDoc(m, uid, allowedEmails),
    });
  }

  for (const item of localState.shopItems) {
    ops.push({
      ref: doc(db, 'shop_items', item.id),
      data: buildShopItemCreateDoc(item, uid, allowedEmails),
    });
  }

  for (const rep of localState.sickReports) {
    ops.push({
      ref: doc(db, 'sick_reports', rep.id),
      data: buildSickReportCreateDoc(rep, uid, allowedEmails),
    });
  }

  for (const bill of localState.snackBills) {
    ops.push({
      ref: doc(db, 'snack_bills', bill.id),
      data: buildSnackBillCreateDoc(bill, uid, allowedEmails),
    });
  }

  try {
    const chunkSize = 400;
    for (let i = 0; i < ops.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + chunkSize)) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'foundation_seed_batch');
  }
}

export interface CloudSyncCallbacks {
  onMembers: (members: Member[]) => void;
  onShopItems: (items: ShopItem[]) => void;
  onSickReports: (reports: SickReport[]) => void;
  onSnackBills: (bills: SnackBill[]) => void;
  onSettings: (settings: AppSettings) => void;
  onPermissionDenied: (email: string) => void;
}

export function subscribeToFoundationCloudSync(
  userEmail: string,
  callbacks: CloudSyncCallbacks
): () => void {
  const emailLower = userEmail.trim().toLowerCase();

  const onQueryError = (path: string) => (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
      callbacks.onPermissionDenied(emailLower);
      return;
    }
    handleFirestoreError(err, OperationType.LIST, path);
  };

  const qMembers = query(
    collection(db, 'members'),
    where('allowedEmails', 'array-contains', emailLower)
  );
  const qShop = query(
    collection(db, 'shop_items'),
    where('allowedEmails', 'array-contains', emailLower)
  );
  const qSick = query(
    collection(db, 'sick_reports'),
    where('allowedEmails', 'array-contains', emailLower)
  );
  const qBills = query(
    collection(db, 'snack_bills'),
    where('allowedEmails', 'array-contains', emailLower)
  );
  const qSettings = query(
    collection(db, 'foundation_settings'),
    where('allowedEmails', 'array-contains', emailLower)
  );

  const unsubs = [
    onSnapshot(
      qMembers,
      (snap) => {
        if (snap.empty) return;
        const list = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as Member),
            phoneBlockedReason: raw.phoneBlockedReason ? String(raw.phoneBlockedReason) : undefined,
            equippedOutfitId: raw.equippedOutfitId ? String(raw.equippedOutfitId) : undefined,
            customCoverImageBase64: raw.customCoverImageBase64
              ? String(raw.customCoverImageBase64)
              : undefined,
          };
        });
        callbacks.onMembers(list);
      },
      onQueryError('members')
    ),
    onSnapshot(
      qShop,
      (snap) => {
        if (snap.empty) return;
        const list = snap.docs.map((d) => d.data() as unknown as ShopItem);
        callbacks.onShopItems(list);
      },
      onQueryError('shop_items')
    ),
    onSnapshot(
      qSick,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as unknown as SickReport);
        list.sort((a, b) => `${b.dateStr} ${b.reportedAt}`.localeCompare(`${a.dateStr} ${a.reportedAt}`));
        callbacks.onSickReports(list);
      },
      onQueryError('sick_reports')
    ),
    onSnapshot(
      qBills,
      (snap) => {
        const list = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: String(raw.id),
            kidId: String(raw.kidId),
            kidNickname: String(raw.kidNickname),
            itemId: String(raw.itemId),
            itemName: String(raw.itemName),
            category: raw.category as SnackBill['category'],
            priceStars: Number(raw.priceStars),
            createdAt: String(raw.createdAtLabel || raw.createdAt || ''),
            dateStr: String(raw.dateStr),
            fulfilled: Boolean(raw.fulfilled),
          } satisfies SnackBill;
        });
        list.sort((a, b) => `${b.dateStr} ${b.createdAt}`.localeCompare(`${a.dateStr} ${a.createdAt}`));
        callbacks.onSnackBills(list);
      },
      onQueryError('snack_bills')
    ),
    onSnapshot(
      qSettings,
      (snap) => {
        const mainDoc = snap.docs.find((d) => d.id === 'main');
        if (!mainDoc) return;
        const raw = mainDoc.data() as Record<string, unknown>;
        callbacks.onSettings({
          creatorPins: Array.isArray(raw.creatorPins) ? (raw.creatorPins as string[]) : ['9292', '6417'],
          googleSheetsUrl: String(raw.googleSheetsUrl || ''),
          allowedSyncEmails: Array.isArray(raw.allowedEmails)
            ? (raw.allowedEmails as string[])
            : [BOOTSTRAP_ADMIN_EMAIL],
          holidayDate: raw.holidayDate ? String(raw.holidayDate) : '',
          doorCommands:
            Array.isArray(raw.doorCommands) && raw.doorCommands.length > 0
              ? sanitizeDoorCommandsForFirestore(raw.doorCommands as DoorCommandConfig[])
              : undefined,
        });
      },
      onQueryError('foundation_settings')
    ),
  ];

  return () => {
    unsubs.forEach((u) => u());
  };
}

export async function syncMemberProgressToCloud(member: Member, uid: string): Promise<void> {
  const path = `members/${member.id}`;
  try {
    await updateDoc(doc(db, 'members', member.id), buildMemberProgressUpdateDoc(member, uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function syncMemberAdminFieldsToCloud(member: Member, uid: string): Promise<void> {
  const path = `members/${member.id}`;
  try {
    await updateDoc(doc(db, 'members', member.id), {
      ...buildMemberProgressUpdateDoc(member, uid),
      personalDriveUrl: clampString(member.personalDriveUrl, 500),
      restrictedDocsUrl: clampString(member.restrictedDocsUrl, 500),
      nickname: clampString(member.nickname, 60),
      fullName: clampString(member.fullName, 140),
      ...(member.emoji ? { emoji: clampString(member.emoji, 16) } : {}),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createMemberInCloud(
  member: Member,
  uid: string,
  allowedEmails: string[]
): Promise<void> {
  const path = `members/${member.id}`;
  try {
    await setDoc(doc(db, 'members', member.id), buildMemberCreateDoc(member, uid, allowedEmails));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteMemberInCloud(memberId: string): Promise<void> {
  const path = `members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createShopItemInCloud(
  item: ShopItem,
  uid: string,
  allowedEmails: string[]
): Promise<void> {
  const path = `shop_items/${item.id}`;
  try {
    await setDoc(doc(db, 'shop_items', item.id), buildShopItemCreateDoc(item, uid, allowedEmails));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteShopItemInCloud(itemId: string): Promise<void> {
  const path = `shop_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'shop_items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createSickReportInCloud(
  report: SickReport,
  uid: string,
  allowedEmails: string[]
): Promise<void> {
  const path = `sick_reports/${report.id}`;
  try {
    await setDoc(
      doc(db, 'sick_reports', report.id),
      buildSickReportCreateDoc(report, uid, allowedEmails)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function resolveSickReportInCloud(reportId: string, uid: string): Promise<void> {
  const path = `sick_reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'sick_reports', reportId), {
      resolved: true,
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createSnackBillInCloud(
  bill: SnackBill,
  uid: string,
  allowedEmails: string[]
): Promise<void> {
  const path = `snack_bills/${bill.id}`;
  try {
    await setDoc(doc(db, 'snack_bills', bill.id), buildSnackBillCreateDoc(bill, uid, allowedEmails));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fulfillSnackBillInCloud(billId: string, uid: string): Promise<void> {
  const path = `snack_bills/${billId}`;
  try {
    await updateDoc(doc(db, 'snack_bills', billId), {
      fulfilled: true,
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateSettingsAndAllowlistInCloud(
  settings: AppSettings,
  uid: string,
  currentUserEmail: string
): Promise<void> {
  const allowedEmails = normalizeAllowedEmails(settings.allowedSyncEmails);
  const path = 'foundation_settings/main';
  try {
    await updateDoc(doc(db, 'foundation_settings', 'main'), {
      creatorPins: settings.creatorPins.slice(0, 10),
      googleSheetsUrl: clampString(settings.googleSheetsUrl, 500),
      allowedEmails,
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    });

    const emailLower = currentUserEmail.trim().toLowerCase();
    const collectionsToPropagate = ['members', 'shop_items', 'sick_reports', 'snack_bills'] as const;
    for (const colName of collectionsToPropagate) {
      const snap = await getDocs(
        query(collection(db, colName), where('allowedEmails', 'array-contains', emailLower))
      );
      if (snap.empty) continue;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, {
          allowedEmails,
          updatedByUid: uid,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateHolidayDateInCloud(holidayDate: string, uid: string): Promise<void> {
  const path = 'foundation_settings/main';
  try {
    await updateDoc(doc(db, 'foundation_settings', 'main'), {
      holidayDate: clampString(holidayDate, 10),
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateDoorCommandsInCloud(
  doorCommands: DoorCommandConfig[],
  uid: string
): Promise<void> {
  const path = 'foundation_settings/main';
  try {
    await updateDoc(doc(db, 'foundation_settings', 'main'), {
      doorCommands: sanitizeDoorCommandsForFirestore(doorCommands),
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Compresses an uploaded shop item image to a compact JPEG data URL (< 90 KB)
 * so it comfortably satisfies Firestore document size limits.
 */
export function compressImageFileToDataUrl(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        resolve(compressed);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image'));
    };
    img.src = objectUrl;
  });
}

/**
 * Compresses a custom 16:9 cover image to a compact JPEG data URL (< 110 KB)
 * so it fits comfortably within Firestore document size limits.
 */
export function compressCoverImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const targetW = Math.min(720, Math.max(320, img.width));
        const targetH = Math.round((targetW * 9) / 16);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(0, 0, targetW, targetH);

        // Cover-crop centered 16:9
        const srcRatio = img.width / img.height;
        const dstRatio = targetW / targetH;
        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;
        if (srcRatio > dstRatio) {
          sw = img.height * dstRatio;
          sx = (img.width - sw) / 2;
        } else if (srcRatio < dstRatio) {
          sh = img.width / dstRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        let compressed = canvas.toDataURL('image/jpeg', 0.76);
        if (compressed.length > 130000) {
          compressed = canvas.toDataURL('image/jpeg', 0.56);
        }
        resolve(compressed);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode cover image'));
    };
    img.src = objectUrl;
  });
}

/**
 * Optional 2-way pull from Google Sheets Web App URL (expects doGet JSON returning { state: BarnhemState }).
 */
export async function pullStateFromGoogleSheets(url: string): Promise<BarnhemState | null> {
  const trimmed = url.trim();
  if (!trimmed || typeof fetch === 'undefined') return null;
  const sep = trimmed.includes('?') ? '&' : '?';
  const res = await fetch(`${trimmed}${sep}action=getState`, {
    method: 'GET',
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const payload = (await res.json()) as { state?: BarnhemState } | BarnhemState;
  const candidate =
    payload && typeof payload === 'object' && 'state' in payload && payload.state
      ? payload.state
      : (payload as BarnhemState);
  if (!candidate || !Array.isArray(candidate.members) || candidate.members.length === 0) {
    return null;
  }
  return candidate;
}

export const APPS_SCRIPT_TWO_WAY_SNIPPET = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('BarnhemSync')
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet('BarnhemSync');
  var payload = JSON.parse(e.postData.contents);
  sheet.getRange('A1').setValue(JSON.stringify(payload.state));
  sheet.getRange('B1').setValue(new Date().toISOString());
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('BarnhemSync');
  var raw = sheet ? sheet.getRange('A1').getValue() : '';
  var out = raw ? { ok: true, state: JSON.parse(raw) } : { ok: false };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}`;
