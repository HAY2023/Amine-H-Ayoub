import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  hasValidSupabaseKey: true,
  supabase: {
    functions: { invoke: mocks.invokeMock },
    from: mocks.fromMock,
  },
}));

import { sendSupportReportEmail } from "@/services/resendService";

describe("sendSupportReportEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friendly message when the network request fails", async () => {
    mocks.invokeMock.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.fromMock.mockReturnValue({
      upsert: () => ({
        select: () => ({
          single: async () => {
            throw new TypeError("Failed to fetch");
          },
        }),
      }),
    });

    const result = await sendSupportReportEmail({
      type: "bug",
      typeLabel: "مشكلة تقنية",
      description: "تجربة",
      senderEmail: "test@example.com",
      profileName: "مستخدم",
      appVersion: "1.0.0",
      platform: "Web",
      timestamp: "2026-09-02",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("اتصال الإنترنت");
    expect(result.error).not.toContain("Failed to fetch");
  });
});
