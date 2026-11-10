import { resolveDemoAccount } from "@/lib/demo";
import { demoDataEnabled } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * Public description of the demo sign-in so the login screen shows the account
 * this deployment actually configured. The password is never returned.
 */
export async function GET() {
  const demo = await resolveDemoAccount();
  return Response.json(
    {
      enabled: demoDataEnabled(),
      email: demo.email,
      name: demo.name,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
