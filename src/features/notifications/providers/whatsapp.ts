import type { MessageTemplate } from "@/features/notifications/templates";

export type TransportResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; code: string; message: string };

export class NoTransport extends Error {
  constructor(public readonly channel: "whatsapp" | "email") {
    super(`${channel} transport is not configured`);
  }
}

/**
 * WhatsApp via the Meta Cloud API using a pre-approved business template.
 * Business-initiated messages must use templates, so we send the template code
 * plus ordered body parameters rather than free text.
 *
 * Config: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION (default v21.0).
 */
export async function sendWhatsApp(input: {
  toE164: string;
  template: MessageTemplate;
  params: string[];
  locale: string;
}): Promise<TransportResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
  if (!token || !phoneId) throw new NoTransport("whatsapp");

  const locale = input.locale === "en" ? "en" : input.locale.slice(0, 2);
  const body = {
    messaging_product: "whatsapp",
    to: input.toE164,
    type: "template",
    template: {
      name: input.template.whatsappTemplate,
      language: { code: locale },
      components: [
        {
          type: "body",
          parameters: input.params.map((text) => ({ type: "text", text: text.slice(0, 120) })),
        },
      ],
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string; error_data?: { details?: string } };
    };
    if (response.ok && data.messages?.[0]?.id) {
      return { ok: true, providerMessageId: data.messages[0].id };
    }
    return {
      ok: false,
      code: `whatsapp_${data.error?.code ?? response.status}`,
      message: data.error?.message ?? data.error?.error_data?.details ?? "WhatsApp send failed",
    };
  } catch (error) {
    return {
      ok: false,
      code: "whatsapp_network",
      message: error instanceof Error ? error.message : "WhatsApp unreachable",
    };
  }
}

/** Normalises a saved phone number to E.164-ish digits for the Graph API. */
export function toE164(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  // UK-style fallback for stored local numbers; keeps demo data usable.
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}
