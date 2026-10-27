import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { Database, Tables } from "@/lib/database.types";
import { nextMeetupDefault } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";
import { computeMemberStats } from "@/lib/streaks";

export const DEMO_COOKIE = "hw_demo_uid";

type LocalDb = {
  users: { id: string; email: string }[];
  profiles: Tables<"profiles">[];
  groups: Tables<"groups">[];
  group_members: Tables<"group_members">[];
  rounds: Tables<"rounds">[];
  resources: Tables<"resources">[];
  rsvps: Tables<"rsvps">[];
  checkins: Tables<"checkins">[];
  attendance: Tables<"attendance">[];
  suggestions: Tables<"suggestions">[];
  suggestion_votes: Tables<"suggestion_votes">[];
  push_subscriptions: Tables<"push_subscriptions">[];
  notifications_sent: Tables<"notifications_sent">[];
};

const DB_PATH = path.join(process.cwd(), ".local-db.json");

function seedDb(): LocalDb {
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const nextThu = nextMeetupDefault(4, "19:00", "Europe/Berlin").toISOString();

  const uEge = "11111111-1111-1111-1111-111111111111";
  const uMert = "22222222-2222-2222-2222-222222222222";
  const uKerem = "33333333-3333-3333-3333-333333333333";
  const uAylin = "44444444-4444-4444-4444-444444444444";
  const uSelin = "55555555-5555-5555-5555-555555555555";
  const gHomies = "aaaaaaaa-0000-0000-0000-000000000001";
  const r1 = "bbbbbbbb-0000-0000-0000-000000000001";
  const r2 = "bbbbbbbb-0000-0000-0000-000000000002";
  const r3 = "bbbbbbbb-0000-0000-0000-000000000003";
  const s1 = "cccccccc-0000-0000-0000-000000000001";
  const s2 = "cccccccc-0000-0000-0000-000000000002";
  const s3 = "cccccccc-0000-0000-0000-000000000003";

  return {
    users: [
      { id: uEge, email: "ege@homiework.test" },
      { id: uMert, email: "mert@homiework.test" },
      { id: uKerem, email: "kerem@homiework.test" },
      { id: uAylin, email: "aylin@homiework.test" },
      { id: uSelin, email: "selin@homiework.test" },
    ],
    profiles: [
      { id: uEge, display_name: "Ege", avatar_color: "ink", created_at: iso(-30 * day) },
      { id: uMert, display_name: "Mert", avatar_color: "red", created_at: iso(-29 * day) },
      { id: uKerem, display_name: "Kerem", avatar_color: "green", created_at: iso(-29 * day) },
      { id: uAylin, display_name: "Aylin", avatar_color: "plum", created_at: iso(-28 * day) },
      { id: uSelin, display_name: "Selin", avatar_color: "ochre", created_at: iso(-28 * day) },
    ],
    groups: [
      {
        id: gHomies,
        name: "The Homies",
        invite_code: "homies2026",
        meet_weekday: 4,
        meet_time: "19:00",
        timezone: "Europe/Berlin",
        created_by: uEge,
        created_at: iso(-30 * day),
      },
    ],
    group_members: [
      { group_id: gHomies, user_id: uEge, role: "owner", rotation_position: 0, joined_at: iso(-30 * day) },
      { group_id: gHomies, user_id: uMert, role: "member", rotation_position: 1, joined_at: iso(-29 * day) },
      { group_id: gHomies, user_id: uKerem, role: "member", rotation_position: 2, joined_at: iso(-29 * day) },
      { group_id: gHomies, user_id: uAylin, role: "member", rotation_position: 3, joined_at: iso(-28 * day) },
      { group_id: gHomies, user_id: uSelin, role: "member", rotation_position: 4, joined_at: iso(-28 * day) },
    ],
    rounds: [
      {
        id: r1,
        group_id: gHomies,
        number: 1,
        host_id: uEge,
        status: "closed",
        topic_title: "Why do we dream?",
        why: "Half of us swear dreams mean something and the other half think it's noise. Let's find out who's right.",
        meetup_at: iso(-18 * day),
        meetup_place: "Ege's place",
        published_at: iso(-23 * day),
        closed_at: iso(-17 * day),
        created_at: iso(-27 * day),
      },
      {
        id: r2,
        group_id: gHomies,
        number: 2,
        host_id: uMert,
        status: "closed",
        topic_title: "How did the Roman Republic fall?",
        why: "Everyone keeps comparing things to the fall of Rome. None of us could say what actually happened.",
        meetup_at: iso(-11 * day),
        meetup_place: "Café Kranzler",
        published_at: iso(-16 * day),
        closed_at: iso(-10 * day),
        created_at: iso(-17 * day),
      },
      {
        id: r3,
        group_id: gHomies,
        number: 3,
        host_id: uKerem,
        status: "assigned",
        topic_title: "How does the Federal Reserve set interest rates?",
        why: "We keep arguing about inflation and none of us actually knows how the rate gets decided.",
        meetup_at: nextThu,
        meetup_place: "Kerem's place",
        published_at: iso(-2 * day),
        closed_at: null,
        created_at: iso(-10 * day),
      },
    ],
    resources: [
      {
        id: "dddddddd-0000-0000-0000-000000000001",
        round_id: r3,
        url: "https://www.federalreserve.gov/monetarypolicy/fomc.htm",
        label: "What the FOMC is and how it votes",
        kind: "read",
        minutes: 10,
        sort: 0,
      },
      {
        id: "dddddddd-0000-0000-0000-000000000002",
        round_id: r3,
        url: "https://www.npr.org/sections/money/",
        label: "Planet Money on rate hikes",
        kind: "listen",
        minutes: 25,
        sort: 1,
      },
      {
        id: "dddddddd-0000-0000-0000-000000000003",
        round_id: r3,
        url: "https://www.youtube.com/results?search_query=how+the+fed+sets+interest+rates",
        label: "How the Fed steers rates, explained",
        kind: "watch",
        minutes: 14,
        sort: 2,
      },
    ],
    rsvps: [
      { round_id: r3, user_id: uKerem, status: "going", updated_at: iso(-1 * day) },
      { round_id: r3, user_id: uAylin, status: "going", updated_at: iso(-1 * day) },
      { round_id: r3, user_id: uMert, status: "maybe", updated_at: iso(-1 * day) },
    ],
    checkins: [
      { round_id: r1, user_id: uEge, done_at: iso(-19 * day) },
      { round_id: r1, user_id: uMert, done_at: iso(-19 * day) },
      { round_id: r1, user_id: uAylin, done_at: iso(-19 * day) },
      { round_id: r2, user_id: uEge, done_at: iso(-12 * day) },
      { round_id: r2, user_id: uMert, done_at: iso(-12 * day) },
      { round_id: r2, user_id: uKerem, done_at: iso(-12 * day) },
      { round_id: r2, user_id: uAylin, done_at: iso(-12 * day) },
      { round_id: r3, user_id: uKerem, done_at: iso(-1 * day) },
      { round_id: r3, user_id: uAylin, done_at: iso(-20 * 3_600_000) },
    ],
    attendance: [
      { round_id: r1, user_id: uEge, attended: true },
      { round_id: r1, user_id: uMert, attended: true },
      { round_id: r1, user_id: uKerem, attended: true },
      { round_id: r1, user_id: uAylin, attended: true },
      { round_id: r1, user_id: uSelin, attended: false },
      { round_id: r2, user_id: uEge, attended: true },
      { round_id: r2, user_id: uMert, attended: true },
      { round_id: r2, user_id: uKerem, attended: true },
      { round_id: r2, user_id: uAylin, attended: true },
      { round_id: r2, user_id: uSelin, attended: true },
    ],
    suggestions: [
      {
        id: s1,
        group_id: gHomies,
        author_id: uAylin,
        title: "How do vaccines train the immune system?",
        pitch: "I nodded along through 2021 without really getting it.",
        used_in_round: null,
        created_at: iso(-9 * day),
      },
      {
        id: s2,
        group_id: gHomies,
        author_id: uSelin,
        title: "What makes a song get stuck in your head?",
        pitch: null,
        used_in_round: null,
        created_at: iso(-6 * day),
      },
      {
        id: s3,
        group_id: gHomies,
        author_id: uMert,
        title: 'Why is the Ottoman Empire called "the sick man of Europe"?',
        pitch: "My grandad says it every dinner. Time to check.",
        used_in_round: null,
        created_at: iso(-3 * day),
      },
    ],
    suggestion_votes: [
      { suggestion_id: s1, user_id: uEge },
      { suggestion_id: s1, user_id: uKerem },
      { suggestion_id: s1, user_id: uAylin },
      { suggestion_id: s3, user_id: uMert },
      { suggestion_id: s3, user_id: uSelin },
      { suggestion_id: s2, user_id: uSelin },
    ],
    push_subscriptions: [],
    notifications_sent: [],
  };
}

function readDb(): LocalDb {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as LocalDb;
    }
  } catch {
    // recreate below
  }
  const initial = seedDb();
  writeDb(initial);
  return initial;
}

function writeDb(db: LocalDb) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function isLocalDemoMode() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return !key || key === "local-demo";
}

function startNextRoundInDb(db: LocalDb, groupId: string): string | null {
  const groupRounds = db.rounds
    .filter((r) => r.group_id === groupId)
    .toSorted((a, b) => b.number - a.number);
  const last = groupRounds[0];
  const members = db.group_members
    .filter((m) => m.group_id === groupId)
    .toSorted((a, b) => a.rotation_position - b.rotation_position);
  if (members.length === 0) return null;

  let hostId: string;
  if (!last?.host_id || !members.some((m) => m.user_id === last.host_id)) {
    hostId = members[0].user_id;
  } else {
    hostId = nextHost(members, last.host_id)?.user_id ?? members[0].user_id;
  }

  const id = randomUUID();
  db.rounds.push({
    id,
    group_id: groupId,
    number: (last?.number ?? 0) + 1,
    host_id: hostId,
    status: "awaiting_topic",
    topic_title: null,
    why: null,
    meetup_at: null,
    meetup_place: null,
    published_at: null,
    closed_at: null,
    created_at: new Date().toISOString(),
  });
  return id;
}

type TableName = keyof Database["public"]["Tables"];

export async function createLocalDemoClient(asAdmin = false) {
  const cookieStore = await cookies();
  const currentUid = cookieStore.get(DEMO_COOKIE)?.value ?? null;

  function isMember(db: LocalDb, groupId: string) {
    if (asAdmin) return true;
    return Boolean(
      currentUid &&
        db.group_members.some(
          (m) => m.group_id === groupId && m.user_id === currentUid,
        ),
    );
  }

  function isOwner(db: LocalDb, groupId: string) {
    if (asAdmin) return true;
    return Boolean(
      currentUid &&
        db.group_members.some(
          (m) =>
            m.group_id === groupId &&
            m.user_id === currentUid &&
            m.role === "owner",
        ),
    );
  }

  function decorateRow(
    db: LocalDb,
    table: TableName,
    row: Record<string, unknown>,
    selectStr: string,
  ): Record<string, unknown> | null {
    const out: Record<string, unknown> = { ...row };
    if (table === "group_members" && selectStr.includes("group:groups")) {
      const g = db.groups.find((x) => x.id === row.group_id);
      if (!g) return null;
      out.group = { id: g.id, name: g.name };
    }
    if (table === "group_members" && selectStr.includes("profile:profiles")) {
      const p = db.profiles.find((x) => x.id === row.user_id);
      if (!p) return null;
      out.profile = {
        id: p.id,
        display_name: p.display_name,
        avatar_color: p.avatar_color,
      };
    }
    if (table === "rounds" && selectStr.includes("groups!inner")) {
      const g = db.groups.find((x) => x.id === row.group_id);
      if (!g) return null;
      out.groups = { name: g.name, timezone: g.timezone };
    }
    if (table === "suggestion_votes" && selectStr.includes("suggestions!inner")) {
      const s = db.suggestions.find((x) => x.id === row.suggestion_id);
      if (!s) return null;
      out.suggestions = { group_id: s.group_id };
    }
    return out;
  }

  function canReadRow(db: LocalDb, table: TableName, row: Record<string, unknown>) {
    if (asAdmin) return true;
    if (!currentUid) return false;
    switch (table) {
      case "profiles":
        return true;
      case "groups":
        return isMember(db, String(row.id));
      case "group_members":
      case "rounds":
      case "suggestions":
        return isMember(db, String(row.group_id));
      case "resources":
      case "rsvps":
      case "checkins":
      case "attendance": {
        const round = db.rounds.find((r) => r.id === row.round_id);
        return Boolean(round && isMember(db, round.group_id));
      }
      case "suggestion_votes": {
        const sug = db.suggestions.find((s) => s.id === row.suggestion_id);
        return Boolean(sug && isMember(db, sug.group_id));
      }
      case "push_subscriptions":
        return row.user_id === currentUid;
      default:
        return false;
    }
  }

  function makeBuilder(table: TableName) {
    let op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    let selectStr = "*";
    let payload: unknown = null;
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let maxRows: number | null = null;
    let singleMode: "none" | "single" | "maybeSingle" = "none";

    function getField(row: Record<string, unknown>, col: string): unknown {
      if (col.includes(".")) {
        const [rel, key] = col.split(".");
        const nested = row[rel] as Record<string, unknown> | undefined;
        return nested?.[key];
      }
      return row[col];
    }

    function execute() {
      const db = readDb();
      const collection = db[table] as unknown as Record<string, unknown>[];

      if (op === "insert") {
        const items = (Array.isArray(payload) ? payload : [payload]) as Record<
          string,
          unknown
        >[];
        const inserted: Record<string, unknown>[] = [];
        for (const item of items) {
          const record: Record<string, unknown> = {
            ...(table === "suggestions" ||
            table === "resources" ||
            table === "push_subscriptions"
              ? { id: (item.id as string) ?? randomUUID() }
              : {}),
            ...(table === "suggestions" ||
            table === "push_subscriptions" ||
            table === "profiles"
              ? { created_at: new Date().toISOString() }
              : {}),
            ...(table === "checkins" ? { done_at: new Date().toISOString() } : {}),
            ...(table === "notifications_sent"
              ? { sent_at: new Date().toISOString() }
              : {}),
            ...item,
          };
          collection.push(record);
          inserted.push(record);
        }
        writeDb(db);
        const data =
          singleMode !== "none" ? (inserted[0] ?? null) : inserted;
        return { data, error: null, count: inserted.length };
      }

      if (op === "upsert") {
        const item = payload as Record<string, unknown>;
        const keyCols =
          table === "rsvps" || table === "checkins" || table === "attendance"
            ? ["round_id", "user_id"]
            : table === "suggestion_votes"
              ? ["suggestion_id", "user_id"]
              : ["id"];
        const existingIdx = collection.findIndex((r) =>
          keyCols.every((k) => r[k] === item[k]),
        );
        if (existingIdx >= 0) {
          collection[existingIdx] = { ...collection[existingIdx], ...item };
        } else {
          collection.push({
            ...(table === "checkins" ? { done_at: new Date().toISOString() } : {}),
            ...item,
          });
        }
        writeDb(db);
        return { data: item, error: null, count: 1 };
      }

      if (op === "update") {
        const patch = payload as Record<string, unknown>;
        const updated: Record<string, unknown>[] = [];
        for (let i = 0; i < collection.length; i++) {
          const row = collection[i];
          if (filters.every((f) => f(row))) {
            collection[i] = { ...row, ...patch };
            updated.push(collection[i]);
          }
        }
        writeDb(db);
        return {
          data: singleMode !== "none" ? (updated[0] ?? null) : updated,
          error: null,
          count: updated.length,
        };
      }

      if (op === "delete") {
        let removed = 0;
        for (let i = collection.length - 1; i >= 0; i--) {
          const row = collection[i];
          if (filters.every((f) => f(row))) {
            if (!asAdmin && table === "suggestions" && row.author_id !== currentUid) {
              continue;
            }
            collection.splice(i, 1);
            removed++;
          }
        }
        writeDb(db);
        return { data: null, error: null, count: removed };
      }

      // SELECT
      let rows = collection
        .filter((r) => canReadRow(db, table, r))
        .map((r) => decorateRow(db, table, r, selectStr))
        .filter((r): r is Record<string, unknown> => r !== null)
        .filter((r) => filters.every((f) => f(r)));

      if (orderCol) {
        const col = orderCol;
        const dir = orderAsc ? 1 : -1;
        rows = rows.toSorted((a, b) => {
          const va = getField(a, col) as string | number;
          const vb = getField(b, col) as string | number;
          return va < vb ? -dir : va > vb ? dir : 0;
        });
      }
      if (maxRows !== null) {
        rows = rows.slice(0, maxRows);
      }
      if (singleMode !== "none") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    }

    const builder = {
      select(cols = "*") {
        selectStr = cols;
        return builder;
      },
      insert(values: unknown) {
        op = "insert";
        payload = values;
        return builder;
      },
      update(values: unknown) {
        op = "update";
        payload = values;
        return builder;
      },
      upsert(values: unknown) {
        op = "upsert";
        payload = values;
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push((r) => getField(r, col) === val);
        return builder;
      },
      neq(col: string, val: unknown) {
        filters.push((r) => getField(r, col) !== val);
        return builder;
      },
      in(col: string, vals: readonly unknown[]) {
        const set = new Set(vals);
        filters.push((r) => set.has(getField(r, col)));
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending ?? true;
        return builder;
      },
      limit(n: number) {
        maxRows = n;
        return builder;
      },
      single() {
        singleMode = "single";
        return Promise.resolve(execute());
      },
      maybeSingle() {
        singleMode = "maybeSingle";
        return Promise.resolve(execute());
      },
      then<TResult1 = ReturnType<typeof execute>, TResult2 = never>(
        onfulfilled?: ((value: ReturnType<typeof execute>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(execute()).then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  return {
    auth: {
      async getUser() {
        const db = readDb();
        const u = currentUid ? db.users.find((x) => x.id === currentUid) : null;
        return {
          data: {
            user: u ? { id: u.id, email: u.email } : null,
          },
          error: null,
        };
      },
      async getClaims() {
        const db = readDb();
        const u = currentUid ? db.users.find((x) => x.id === currentUid) : null;
        return {
          data: u ? { claims: { sub: u.id, email: u.email } } : null,
          error: null,
        };
      },
      async signInWithOtp({ email }: { email: string }) {
        const db = readDb();
        const clean = email.trim().toLowerCase();
        let u = db.users.find((x) => x.email.toLowerCase() === clean);
        if (!u) {
          u = { id: randomUUID(), email: clean };
          db.users.push(u);
          db.profiles.push({
            id: u.id,
            display_name: "",
            avatar_color: "ink",
            created_at: new Date().toISOString(),
          });
          writeDb(db);
        }
        return { data: {}, error: null };
      },
      async verifyOtp(params: {
        email?: string;
        token?: string;
        token_hash?: string;
        type: string;
      }) {
        const db = readDb();
        const email = (params.email ?? params.token_hash ?? "").trim().toLowerCase();
        let u = db.users.find((x) => x.email.toLowerCase() === email);
        if (!u && email) {
          u = { id: randomUUID(), email };
          db.users.push(u);
          db.profiles.push({
            id: u.id,
            display_name: "",
            avatar_color: "ink",
            created_at: new Date().toISOString(),
          });
          writeDb(db);
        }
        if (!u) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid code" },
          };
        }
        cookieStore.set(DEMO_COOKIE, u.id, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });
        return {
          data: { user: { id: u.id, email: u.email }, session: {} },
          error: null,
        };
      },
      async signOut() {
        cookieStore.delete(DEMO_COOKIE);
        return { error: null };
      },
    },
    from(table: TableName) {
      return makeBuilder(table);
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      const db = readDb();

      if (fn === "create_group") {
        if (!currentUid) {
          return { data: null, error: { code: "28000", message: "Sign in first" } };
        }
        const id = randomUUID();
        const invite_code = randomBytes(6).toString("hex");
        db.groups.push({
          id,
          name: String(args.p_name).trim(),
          invite_code,
          meet_weekday: Number(args.p_weekday),
          meet_time: String(args.p_time),
          timezone: String(args.p_timezone || "UTC"),
          created_by: currentUid,
          created_at: new Date().toISOString(),
        });
        db.group_members.push({
          group_id: id,
          user_id: currentUid,
          role: "owner",
          rotation_position: 0,
          joined_at: new Date().toISOString(),
        });
        startNextRoundInDb(db, id);
        writeDb(db);
        return { data: id, error: null };
      }

      if (fn === "invite_preview") {
        const code = String(args.p_code ?? "").trim().toLowerCase();
        const g = db.groups.find((x) => x.invite_code === code);
        if (!g) return { data: [], error: null };
        const members = db.group_members.filter((m) => m.group_id === g.id);
        return {
          data: [
            {
              group_id: g.id,
              name: g.name,
              member_count: members.length,
              already_member: Boolean(
                currentUid && members.some((m) => m.user_id === currentUid),
              ),
            },
          ],
          error: null,
        };
      }

      if (fn === "join_group") {
        if (!currentUid) {
          return { data: null, error: { code: "28000", message: "Sign in first" } };
        }
        const code = String(args.p_code ?? "").trim().toLowerCase();
        const g = db.groups.find((x) => x.invite_code === code);
        if (!g) {
          return {
            data: null,
            error: { code: "P0002", message: "That invite link has expired" },
          };
        }
        const members = db.group_members.filter((m) => m.group_id === g.id);
        if (!members.some((m) => m.user_id === currentUid)) {
          const maxPos = members.reduce(
            (acc, m) => Math.max(acc, m.rotation_position),
            -1,
          );
          db.group_members.push({
            group_id: g.id,
            user_id: currentUid,
            role: "member",
            rotation_position: maxPos + 1,
            joined_at: new Date().toISOString(),
          });
        }
        if (
          !db.rounds.some((r) => r.group_id === g.id && r.status !== "closed")
        ) {
          startNextRoundInDb(db, g.id);
        }
        writeDb(db);
        return { data: g.id, error: null };
      }

      if (fn === "publish_topic") {
        const round = db.rounds.find((r) => r.id === args.p_round);
        if (!round || round.host_id !== currentUid) {
          return {
            data: null,
            error: {
              code: "42501",
              message: "Only this week's host can set the topic",
            },
          };
        }
        round.topic_title = String(args.p_title).trim();
        round.why = String(args.p_why ?? "").trim() || null;
        round.meetup_at = String(args.p_meetup_at);
        round.meetup_place = String(args.p_place ?? "").trim() || null;
        round.status = "assigned";
        round.published_at ??= new Date().toISOString();

        db.resources = db.resources.filter((r) => r.round_id !== round.id);
        const rawList = (args.p_resources as Record<string, unknown>[]) ?? [];
        rawList.forEach((item, idx) => {
          db.resources.push({
            id: randomUUID(),
            round_id: round.id,
            url: String(item.url),
            label: String(item.label),
            kind: (item.kind as Tables<"resources">["kind"]) ?? "read",
            minutes: item.minutes ? Number(item.minutes) : null,
            sort: idx,
          });
        });

        if (args.p_suggestion) {
          const sug = db.suggestions.find((s) => s.id === args.p_suggestion);
          if (sug && sug.group_id === round.group_id && !sug.used_in_round) {
            sug.used_in_round = round.id;
          }
        }
        writeDb(db);
        return { data: null, error: null };
      }

      if (fn === "pass_turn") {
        const round = db.rounds.find((r) => r.id === args.p_round);
        if (!round || round.host_id !== currentUid) {
          return {
            data: null,
            error: { code: "42501", message: "Only this week's host can pass" },
          };
        }
        const members = db.group_members.filter(
          (m) => m.group_id === round.group_id,
        );
        const next = nextHost(members, round.host_id);
        if (!next || next.user_id === round.host_id) {
          return {
            data: null,
            error: {
              code: "22023",
              message: "There's nobody to pass to yet. Invite someone first.",
            },
          };
        }
        const hostMem = members.find((m) => m.user_id === round.host_id)!;
        const tmp = hostMem.rotation_position;
        hostMem.rotation_position = next.rotation_position;
        next.rotation_position = tmp;
        round.host_id = next.user_id;
        writeDb(db);
        return { data: next.user_id, error: null };
      }

      if (fn === "close_round") {
        const round = db.rounds.find((r) => r.id === args.p_round);
        if (
          !round ||
          (round.host_id !== currentUid && !isOwner(db, round.group_id))
        ) {
          return {
            data: null,
            error: {
              code: "42501",
              message: "Only this week's host can close the week",
            },
          };
        }
        const attendedSet = new Set((args.p_attended as string[]) ?? []);
        const members = db.group_members.filter(
          (m) => m.group_id === round.group_id,
        );
        db.attendance = db.attendance.filter((a) => a.round_id !== round.id);
        for (const m of members) {
          db.attendance.push({
            round_id: round.id,
            user_id: m.user_id,
            attended: attendedSet.has(m.user_id),
          });
        }
        round.status = "closed";
        round.closed_at = new Date().toISOString();
        const nextId = startNextRoundInDb(db, round.group_id);
        writeDb(db);
        return { data: nextId, error: null };
      }

      if (fn === "reorder_rotation") {
        const groupId = String(args.p_group);
        if (!isOwner(db, groupId)) {
          return {
            data: null,
            error: {
              code: "42501",
              message: "Only the group owner can change the order",
            },
          };
        }
        const order = (args.p_order as string[]) ?? [];
        const members = db.group_members.filter((m) => m.group_id === groupId);
        order.forEach((uid, idx) => {
          const m = members.find((x) => x.user_id === uid);
          if (m) m.rotation_position = idx;
        });
        writeDb(db);
        return { data: null, error: null };
      }

      if (fn === "regenerate_invite") {
        const groupId = String(args.p_group);
        if (!isOwner(db, groupId)) {
          return {
            data: null,
            error: {
              code: "42501",
              message: "Only the group owner can reset the invite link",
            },
          };
        }
        const g = db.groups.find((x) => x.id === groupId);
        const code = randomBytes(6).toString("hex");
        if (g) g.invite_code = code;
        writeDb(db);
        return { data: code, error: null };
      }

      if (fn === "leave_group") {
        const groupId = String(args.p_group);
        if (!isMember(db, groupId) || !currentUid) {
          return {
            data: null,
            error: { code: "42501", message: "You're not in this group" },
          };
        }
        const open = db.rounds.find(
          (r) => r.group_id === groupId && r.status !== "closed",
        );
        const members = db.group_members.filter((m) => m.group_id === groupId);
        if (open && open.host_id === currentUid) {
          const next = nextHost(members, currentUid);
          if (!next || next.user_id === currentUid) {
            db.rounds = db.rounds.filter((r) => r.id !== open.id);
          } else if (open.status === "awaiting_topic") {
            open.host_id = next.user_id;
          }
        }
        db.group_members = db.group_members.filter(
          (m) => !(m.group_id === groupId && m.user_id === currentUid),
        );
        const remaining = db.group_members.filter(
          (m) => m.group_id === groupId,
        );
        if (remaining.length === 0) {
          db.groups = db.groups.filter((g) => g.id !== groupId);
        } else if (!remaining.some((m) => m.role === "owner")) {
          remaining[0].role = "owner";
        }
        writeDb(db);
        return { data: null, error: null };
      }

      if (fn === "member_stats") {
        const groupId = String(args.p_group);
        if (!isMember(db, groupId)) return { data: [], error: null };
        const members = db.group_members.filter((m) => m.group_id === groupId);
        const closedRounds = db.rounds
          .filter(
            (r): r is Tables<"rounds"> & { closed_at: string } =>
              r.group_id === groupId &&
              r.status === "closed" &&
              Boolean(r.closed_at),
          )
          .map((r) => ({ id: r.id, number: r.number, closed_at: r.closed_at }));

        const out = members.map((m) => {
          const checkins = new Set(
            db.checkins
              .filter((c) => c.user_id === m.user_id)
              .map((c) => c.round_id),
          );
          const attMap = new Map<string, boolean>();
          for (const a of db.attendance) {
            if (
              a.user_id === m.user_id &&
              closedRounds.some((r) => r.id === a.round_id)
            ) {
              attMap.set(a.round_id, a.attended);
            }
          }
          const stats = computeMemberStats({
            userId: m.user_id,
            joinedAt: m.joined_at,
            closedRounds,
            checkinRoundIds: checkins,
            attendanceByRound: attMap,
          });
          return { user_id: m.user_id, ...stats };
        });
        return { data: out, error: null };
      }

      if (fn === "auto_close_stale_rounds") {
        let count = 0;
        const cutoff = Date.now() - 24 * 3_600_000;
        for (const r of db.rounds) {
          if (
            r.status === "assigned" &&
            r.meetup_at &&
            new Date(r.meetup_at).getTime() < cutoff
          ) {
            r.status = "closed";
            r.closed_at = new Date().toISOString();
            startNextRoundInDb(db, r.group_id);
            count++;
          }
        }
        if (count > 0) writeDb(db);
        return { data: count, error: null };
      }

      return { data: null, error: null };
    },
  };
}
