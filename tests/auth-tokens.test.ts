import { describe, expect, it } from "vitest";
import { hashToken } from "@/lib/auth/tokens";

describe("authentication token hashing", () => {
  it("is deterministic without retaining the plaintext token", () => {
    const token = "a-sensitive-one-time-token";
    const digest = hashToken(token);
    expect(digest).toBe(hashToken(token));
    expect(digest).not.toContain(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
