import { beforeEach, describe, expect, it, vi } from "vitest";

// checkRateLimit is DB-backed (rate_limits table via an INSERT ... ON CONFLICT DO
// UPDATE upsert, then a re-read). Neither existing DB-touching test in this repo
// exercises a real database, so this fakes just enough of the drizzle chain to
// verify the windowing/increment logic without standing up PGlite.
const mockState = vi.hoisted(() => ({
  store: new Map<string, { count: number; expiresAt: Date }>(),
  lastId: null as string | null,
}));

vi.mock("@/lib/db", () => ({
  ensureSchema: async () => {},
  getDb: async () => ({
    insert: () => ({
      values: (row: { id: string; count: number; expiresAt: Date }) => {
        mockState.lastId = row.id;
        return {
          onConflictDoUpdate: async () => {
            const existing = mockState.store.get(row.id);
            if (existing) {
              existing.count += 1;
            } else {
              mockState.store.set(row.id, { count: row.count, expiresAt: row.expiresAt });
            }
          },
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            if (!mockState.lastId) return [];
            const record = mockState.store.get(mockState.lastId);
            return record ? [{ id: mockState.lastId, ...record }] : [];
          },
        }),
      }),
    }),
  }),
}));

const { checkRateLimit } = await import("@/lib/rate-limit");

function makeRequest(ip: string) {
  return new Request("http://localhost/test", { headers: { "x-forwarded-for": ip } });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockState.store.clear();
    mockState.lastId = null;
  });

  it("allows requests up to the configured max, then blocks the next one", async () => {
    const opts = {
      request: makeRequest("10.0.0.1"),
      namespace: "test-allow",
      max: 3,
      windowMinutes: 60,
    };
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(false);
  });

  it("tracks separate buckets per identifier", async () => {
    const req = makeRequest("10.0.0.2");
    const a = { request: req, namespace: "test-identifier", identifier: "user-a", max: 1, windowMinutes: 60 };
    const b = { ...a, identifier: "user-b" };
    expect(await checkRateLimit(a)).toBe(true);
    expect(await checkRateLimit(a)).toBe(false);
    expect(await checkRateLimit(b)).toBe(true);
  });

  it("tracks separate buckets per namespace even for the same IP", async () => {
    const req = makeRequest("10.0.0.3");
    expect(await checkRateLimit({ request: req, namespace: "ns-a", max: 1, windowMinutes: 60 })).toBe(true);
    expect(await checkRateLimit({ request: req, namespace: "ns-b", max: 1, windowMinutes: 60 })).toBe(true);
  });

  it("sets an expiry in the future bounded by the window size", async () => {
    const req = makeRequest("10.0.0.4");
    await checkRateLimit({ request: req, namespace: "test-expiry", max: 5, windowMinutes: 30 });
    const [record] = [...mockState.store.values()];
    expect(record!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(record!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000);
  });
});
