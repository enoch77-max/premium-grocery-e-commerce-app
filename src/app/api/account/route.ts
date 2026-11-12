import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, validateEmail, normaliseEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    marketingOptIn?: boolean;
    orderUpdatesEmail?: boolean;
    orderUpdatesSms?: boolean;
    notifyEmail?: boolean;
    notifyWhatsapp?: boolean;
    whatsappNumber?: string;
  };

  const name = (body.name ?? user.name).trim();
  const email = normaliseEmail(body.email ?? user.email);
  const phone = (body.phone ?? user.phone).trim();

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Tell us your name";
  if (!validateEmail(email)) errors.email = "Enter a valid email address";
  if (phone && !/^[0-9+()\-.\s]{6,20}$/.test(phone)) errors.phone = "Use a valid phone number";
  const whatsappNumber = (body.whatsappNumber ?? user.whatsappNumber).trim();
  if (body.notifyWhatsapp === true && whatsappNumber && !/^\+?[0-9()\-\s]{6,20}$/.test(whatsappNumber)) {
    errors.whatsappNumber = "Use a full number with country code";
  }
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the highlighted fields", errors }, { status: 422 });
  }

  try {
    if (email !== user.email) {
      const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (clash.length && clash[0].id !== user.id) {
        return Response.json({ error: "That email is already in use", field: "email" }, { status: 409 });
      }
    }

    const updated = await db
      .update(users)
      .set({
        name,
        email,
        phone,
        marketingOptIn: body.marketingOptIn ?? user.marketingOptIn,
        orderUpdatesEmail: body.orderUpdatesEmail ?? user.orderUpdatesEmail,
        orderUpdatesSms: body.orderUpdatesSms ?? user.orderUpdatesSms,
        notifyEmail: body.notifyEmail ?? user.notifyEmail,
        notifyWhatsapp: body.notifyWhatsapp ?? user.notifyWhatsapp,
        whatsappNumber: whatsappNumber.slice(0, 20),
      })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        marketingOptIn: users.marketingOptIn,
        orderUpdatesEmail: users.orderUpdatesEmail,
        orderUpdatesSms: users.orderUpdatesSms,
        createdAt: users.createdAt,
      });

    const row = updated[0];
    return Response.json({ user: { ...row, createdAt: row.createdAt.toISOString() } });
  } catch (error) {
    console.error("profile update failed", error);
    return Response.json({ error: "We couldn't save your details. Try again." }, { status: 500 });
  }
}
