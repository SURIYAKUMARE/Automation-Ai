export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.YOUTUBE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || /(?:your[-_]|placeholder|example)/i.test(clientId) || /(?:your[-_]|placeholder|example)/i.test(clientSecret)) return null;
  return { clientId, clientSecret };
}

export function getYouTubeOAuthConfig() {
  const dedicated = Boolean(process.env.YOUTUBE_CLIENT_ID?.trim() || process.env.YOUTUBE_CLIENT_SECRET?.trim());
  if (!dedicated) return getGoogleOAuthConfig();
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || /(?:your[-_]|placeholder|example)/i.test(clientId) || /(?:your[-_]|placeholder|example)/i.test(clientSecret)) return null;
  return { clientId, clientSecret };
}
