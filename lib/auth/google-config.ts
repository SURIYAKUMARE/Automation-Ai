export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !clientId.endsWith('.apps.googleusercontent.com') ||
      /(?:your[-_]|placeholder|example|mock[-_])/i.test(clientId) ||
      /(?:your[-_]|placeholder|example|mock[-_])/i.test(clientSecret)) return null;
  return { clientId, clientSecret };
}
