/**
 * Detects the sandbox host's edge rejection (E2B "missing traffic access token").
 *
 * Protected preview sandboxes reject requests that arrive without their traffic
 * token. Inside arena's own preview pane the token is injected, but if a viewer
 * reaches the app through a path that lacks it, every API call 403s *before*
 * reaching this app. Without this check the shopper just sees a generic
 * "couldn't sign you in", which reads as a broken app.
 */
export async function previewEdgeMessage(response: Response): Promise<string | null> {
  if (response.status !== 403 && response.status !== 401) return null;
  try {
    const text = await response.clone().text();
    if (/traffic access token/i.test(text)) {
      return "This preview's network edge is blocking API calls. Open the preview from the arena panel, or deploy to your own domain.";
    }
  } catch {
    // unreadable body — fall through
  }
  return null;
}
