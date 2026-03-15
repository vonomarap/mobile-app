import { User, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type SupportThreadStatus = "OPEN" | "CLOSED";
export type SupportCustomerMode = "authenticated" | "guest";
export type SupportAuthorRole = "customer" | "admin" | "system";

export type GuestProfile = {
  name: string;
  phone?: string;
  email?: string;
};

export type SupportThread = {
  id: string;
  customerUid?: string;
  customerMode?: SupportCustomerMode;
  guestProfile?: GuestProfile | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status?: SupportThreadStatus;
  lastMessageText?: string | null;
  lastMessageAt?: unknown;
  lastMessageAuthorRole?: SupportAuthorRole | null;
  lastCustomerMessageAt?: unknown;
  lastAdminMessageAt?: unknown;
  customerSeenAt?: unknown;
  adminSeenAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SupportMessage = {
  id: string;
  authorUid?: string;
  authorRole?: SupportAuthorRole;
  text?: string;
  createdAt?: unknown;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function toSupportMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    const maybe = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof maybe.toMillis === "function") {
      try {
        const ms = maybe.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    if (typeof maybe.seconds === "number" && Number.isFinite(maybe.seconds)) {
      return maybe.seconds * 1000;
    }
  }
  return null;
}

function sortThreadsByUpdatedAtDesc(threads: SupportThread[]): SupportThread[] {
  return [...threads].sort((left, right) => {
    const rightMs = toSupportMillis(right.updatedAt) ?? toSupportMillis(right.lastMessageAt) ?? 0;
    const leftMs = toSupportMillis(left.updatedAt) ?? toSupportMillis(left.lastMessageAt) ?? 0;
    return rightMs - leftMs;
  });
}

export function pickActiveSupportThread(threads: SupportThread[]): SupportThread | null {
  const ordered = sortThreadsByUpdatedAtDesc(threads);
  return ordered.find((thread) => thread.status === "OPEN") ?? ordered[0] ?? null;
}

export function customerHasUnreadSupport(thread: SupportThread | null | undefined): boolean {
  if (!thread) return false;
  const lastAdminMessageAt = toSupportMillis(thread.lastAdminMessageAt);
  if (lastAdminMessageAt === null) return false;
  const customerSeenAt = toSupportMillis(thread.customerSeenAt);
  return customerSeenAt === null || lastAdminMessageAt > customerSeenAt;
}

async function ensureSupportUser(user: User | null): Promise<User> {
  if (user) return user;
  const result = await signInAnonymously(auth);
  return result.user;
}

async function fetchCustomerThreads(uid: string): Promise<SupportThread[]> {
  const snap = await getDocs(query(collection(db, "support_threads"), where("customerUid", "==", uid)));
  return sortThreadsByUpdatedAtDesc(snap.docs.map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<SupportThread, "id">) })));
}

function buildThreadPayload(user: User, guestProfile?: GuestProfile | null) {
  const customerMode: SupportCustomerMode = user.isAnonymous ? "guest" : "authenticated";
  const trimmedName = guestProfile?.name?.trim() || user.displayName?.trim() || "";
  const trimmedEmail = guestProfile?.email?.trim() || user.email?.trim() || "";
  const trimmedPhone = guestProfile?.phone?.trim() || "";

  return {
    customerUid: user.uid,
    customerMode,
    guestProfile: customerMode === "guest"
      ? {
          name: trimmedName,
          ...(trimmedPhone ? { phone: trimmedPhone } : {}),
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
        }
      : null,
    customerName: trimmedName || null,
    customerEmail: trimmedEmail || null,
    status: "OPEN" as SupportThreadStatus,
    lastMessageText: null,
    lastMessageAt: null,
    lastMessageAuthorRole: null,
    lastCustomerMessageAt: null,
    lastAdminMessageAt: null,
    customerSeenAt: serverTimestamp(),
    adminSeenAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function getOrCreateSupportThread(input: {
  user: User | null;
  guestProfile?: GuestProfile | null;
}): Promise<SupportThread> {
  const currentUser = await ensureSupportUser(input.user ?? auth.currentUser);
  const existing = pickActiveSupportThread(await fetchCustomerThreads(currentUser.uid));
  if (existing && existing.status === "OPEN") {
    return existing;
  }

  if (currentUser.isAnonymous) {
    const guestProfile = input.guestProfile;
    if (!guestProfile?.name?.trim()) {
      throw new Error("Guest name is required");
    }
    if (!guestProfile.phone?.trim() && !guestProfile.email?.trim()) {
      throw new Error("Guest contact is required");
    }
  }

  const threadRef = doc(collection(db, "support_threads"));
  const payload = buildThreadPayload(currentUser, input.guestProfile ?? null);
  await setDoc(threadRef, payload);
  return { id: threadRef.id, ...payload };
}

export async function sendSupportMessage(input: {
  user: User | null;
  threadId?: string | null;
  text: string;
  guestProfile?: GuestProfile | null;
  thread?: SupportThread | null;
}): Promise<{ threadId: string }> {
  const text = normalizeText(input.text);
  if (!text) {
    throw new Error("Message is required");
  }

  if (input.thread?.status === "CLOSED") {
    throw new Error("Thread is closed");
  }

  const currentUser = await ensureSupportUser(input.user ?? auth.currentUser);
  const thread = input.threadId
    ? ({ id: input.threadId, ...(input.thread ?? {}) } as SupportThread)
    : await getOrCreateSupportThread({ user: currentUser, guestProfile: input.guestProfile ?? null });

  await addDoc(collection(db, "support_threads", thread.id, "messages"), {
    authorUid: currentUser.uid,
    authorRole: "customer",
    text,
    createdAt: serverTimestamp(),
  });

  await markSupportThreadSeenByCustomer(thread.id);
  return { threadId: thread.id };
}

export function subscribeSupportThreadsForCustomer(uid: string, onValue: (threads: SupportThread[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "support_threads"), where("customerUid", "==", uid)), (snapshot) => {
    const threads = sortThreadsByUpdatedAtDesc(
      snapshot.docs.map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<SupportThread, "id">) }))
    );
    onValue(threads);
  });
}

export function subscribeSupportMessages(threadId: string, onValue: (messages: SupportMessage[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "support_threads", threadId, "messages"), (snapshot) => {
    const messages = snapshot.docs
      .map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<SupportMessage, "id">) }))
      .sort((left, right) => {
        const leftMs = toSupportMillis(left.createdAt) ?? 0;
        const rightMs = toSupportMillis(right.createdAt) ?? 0;
        return leftMs - rightMs;
      });
    onValue(messages);
  });
}

export async function markSupportThreadSeenByCustomer(threadId: string): Promise<void> {
  await updateDoc(doc(db, "support_threads", threadId), {
    customerSeenAt: serverTimestamp(),
  });
}
