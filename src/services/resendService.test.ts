import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  hasValidSupabaseKey: () => true,
  supabase: {
    functions: { invoke: mocks.invokeMock },
    from: mocks.fromMock,
  },
}));

import {
  sendSupportReportEmail,
  createWhatsAppSupportLink,
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_WHATSAPP_DISPLAY,
} from "@/services/resendService";

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

    expect(result.success).toBe(true);
    expect(result.whatsappLink).toContain("https://wa.me/213658188644");
    expect(result.mailtoLink).toContain("mailto:");
  });

  it("creates a WhatsApp link targeting 213658188644 correctly", () => {
    expect(SUPPORT_WHATSAPP_NUMBER).toBe("213658188644");
    expect(SUPPORT_WHATSAPP_DISPLAY).toBe("0658188644");

    const link = createWhatsAppSupportLink({
      typeLabel: "مشكلة تقنية",
      profileName: "أحمد",
      description: "توقف الصوت في سورة الفاتحة",
    });

    expect(link).toContain("https://wa.me/213658188644");
    expect(decodeURIComponent(link)).toContain("أحمد");
    expect(decodeURIComponent(link)).toContain("توقف الصوت في سورة الفاتحة");
  });

  it("creates a default WhatsApp link when called with string or empty", () => {
    const stringLink = createWhatsAppSupportLink("رسالة مباشرة");
    expect(stringLink).toContain("https://wa.me/213658188644");
    expect(decodeURIComponent(stringLink)).toContain("رسالة مباشرة");

    const emptyLink = createWhatsAppSupportLink();
    expect(emptyLink).toContain("https://wa.me/213658188644");
  });
});
