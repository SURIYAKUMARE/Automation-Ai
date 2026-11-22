export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !clientId.endsWith('.apps.googleusercontent.com') ||
      /(?:your[-_]|placeholder|example|mock[-_])/i.test(clientId) ||
      /(?:your[-_]|placeholder|example|mock[-_])/i.test(clientSecret)) return null;
  return { clientId, clientSecret };
}

export function getYouTubeOAuthConfig() {
  const dedicated = Boolean(process.env.YOUTUBE_CLIENT_ID?.trim() || process.env.YOUTUBE_CLIENT_SECRET?.trim());
  if (!dedicated) return getGoogleOAuthConfig();
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  if (!clientId?.endsWith('.apps.googleusercontent.com') || !clientSecret ||
    [clientId, clientSecret].some((value) => /(?:your[-_]|placeholder|example|mock[-_])/i.test(value))) return null;
  return { clientId, clientSecret };
}
