import type { NoTransport as NoTransportType } from "@/features/notifications/providers/whatsapp";

export type EmailResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; code: string; message: string };

/**
 * Email via Resend. Config: RESEND_API_KEY and RESEND_FROM ("Fresco <hello@fresco.shop>").
 * Without a key we throw the shared NoTransport error so the dispatcher can mark
 * the event failed with `no_transport` instead of pretending it sent.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || "Fresco <hello@fresco.shop>";
  if (!key) {
    const { NoTransport } = await import("@/features/notifications/providers/whatsapp");
    throw new NoTransport("email");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.body }),
    });
    const data = (await response.json()) as { id?: string; message?: string; name?: string };
    if (response.ok && data.id) return { ok: true, providerMessageId: data.id };
    return { ok: false, code: `email_${response.status}`, message: data.message ?? data.name ?? "Email send failed" };
  } catch (error) {
    return {
      ok: false,
      code: "email_network",
      message: error instanceof Error ? error.message : "Email unreachable",
    };
  }
}

export type { NoTransportType };
