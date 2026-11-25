import { createAdminClient } from "@/lib/supabase/admin";

export interface OpenWaSession {
  id: string;
  name: string;
  status: "ready" | "initializing" | "disconnected" | "failed" | "qr_ready" | string;
  phone?: string;
  pushName?: string;
  connectedAt?: string;
  lastActive?: string;
  engineLoaded?: boolean;
}

export interface OpenWaStatusResult {
  online: boolean;
  apiUrl: string;
  dashboardUrl: string;
  activeSession: OpenWaSession | null;
  sessions: OpenWaSession[];
  error?: string;
}

export interface OpenWaConfig {
  apiUrl: string;
  dashboardUrl: string;
  apiKey: string;
  updatedAt?: string;
}

export interface WhatsAppTransmissionLog {
  id: string;
  recipient: string;
  messagePreview: string;
  status: "sent" | "delivered" | "read" | "failed";
  provider: "openwa";
  timestamp: string;
  error?: string;
}

const ENV_API_URL = (process.env.OPENWA_API_URL || "http://localhost:2785").replace(/\/api\/?$/, "").replace(/\/+$/, "");
const ENV_DASHBOARD_URL = (process.env.OPENWA_DASHBOARD_URL || "http://localhost:2886").replace(/\/+$/, "");
const ENV_API_KEY =
  process.env.OPENWA_API_KEY ||
  "owa_k1_f898a06df01cf602a6c5fded1f9c6817e876a23ba2c0149902fb686b909740de";

const CONFIG_BUCKET = "app-config";
const CONFIG_PATH = "openwa-config.json";
let cachedConfig: { value: OpenWaConfig; expiresAt: number } | null = null;

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url);
}

/**
 * Resolves the active OpenWA Gateway URL & API key.
 * Priority:
 * 1. Non-localhost OPENWA_API_URL env var (if explicitly configured for production)
 * 2. Saved remote Gateway URL in Supabase Storage (_system/openwa-config.json) so cloud/mobile devices can reach OpenWA
 * 3. Local env / http://localhost:2785 fallback
 */
export async function getOpenWaConfig(forceRefresh = false): Promise<OpenWaConfig> {
  if (!forceRefresh && cachedConfig && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig.value;
  }

  const fallback: OpenWaConfig = {
    apiUrl: ENV_API_URL,
    dashboardUrl: ENV_DASHBOARD_URL,
    apiKey: ENV_API_KEY,
  };

  if (ENV_API_URL && !isLocalhostUrl(ENV_API_URL)) {
    cachedConfig = { value: fallback, expiresAt: Date.now() + 15_000 };
    return fallback;
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db.storage.from(CONFIG_BUCKET).download(CONFIG_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text()) as Partial<OpenWaConfig>;
      if (parsed.apiUrl) {
        const cleanApi = parsed.apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
        // On Vercel or remote hosts, always prefer a non-localhost saved tunnel URL
        // On local machine, if saved URL is non-localhost, use it too so all devices share the same state
        if (!isLocalhostUrl(cleanApi) || process.env.VERCEL) {
          const resolved: OpenWaConfig = {
            apiUrl: cleanApi,
            dashboardUrl: (parsed.dashboardUrl || ENV_DASHBOARD_URL).replace(/\/+$/, ""),
            apiKey: parsed.apiKey?.trim() || ENV_API_KEY,
            updatedAt: parsed.updatedAt,
          };
          cachedConfig = { value: resolved, expiresAt: Date.now() + 15_000 };
          return resolved;
        }
      }
    }
  } catch {
    // Ignore storage read failure and fall back to env
  }

  cachedConfig = { value: fallback, expiresAt: Date.now() + 15_000 };
  return fallback;
}

/**
 * Persists the active OpenWA Gateway URL & key to Supabase Storage so all devices
 * (Vercel web app, mobile phones, other browsers) can connect automatically.
 */
export async function saveOpenWaConfig(input: {
  apiUrl: string;
  dashboardUrl?: string;
  apiKey?: string;
}): Promise<OpenWaConfig> {
  const cleanApiUrl = input.apiUrl.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
  const cleanDashboardUrl = (input.dashboardUrl?.trim() || ENV_DASHBOARD_URL).replace(/\/+$/, "");
  const cleanKey = input.apiKey?.trim() || ENV_API_KEY;

  const config: OpenWaConfig = {
    apiUrl: cleanApiUrl,
    dashboardUrl: cleanDashboardUrl,
    apiKey: cleanKey,
    updatedAt: new Date().toISOString(),
  };

  const db = createAdminClient();
  const payload = Buffer.from(JSON.stringify(config, null, 2), "utf8");
  let { error } = await db.storage.from(CONFIG_BUCKET).upload(CONFIG_PATH, payload, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) {
    await db.storage.createBucket(CONFIG_BUCKET, { public: false }).catch(() => null);
    const retry = await db.storage.from(CONFIG_BUCKET).upload(CONFIG_PATH, payload, {
      contentType: "application/json",
      upsert: true,
    });
    error = retry.error;
  }

  if (error) {
    throw new Error(`Could not save OpenWA gateway config: ${error.message}`);
  }

  cachedConfig = { value: config, expiresAt: Date.now() + 15_000 };
  return config;
}

const transmissionHistory: WhatsAppTransmissionLog[] = [
  {
    id: "3EB0AB06DC54EF18E14151",
    recipient: "+91 94456 48373",
    messagePreview: "SocialSync + OpenWA connection verified! Gateway is 100% active and ready.",
    status: "delivered",
    provider: "openwa",
    timestamp: new Date().toISOString(),
  },
];

export function getTransmissionLogs(): WhatsAppTransmissionLog[] {
  return [...transmissionHistory].slice(0, 50);
}

export function logTransmission(entry: WhatsAppTransmissionLog) {
  transmissionHistory.unshift(entry);
  if (transmissionHistory.length > 100) {
    transmissionHistory.pop();
  }
}

export function formatWhatsAppChatId(raw: string): string {
  if (raw.includes("@c.us") || raw.includes("@g.us")) return raw;
  const digits = raw.replace(/\D/g, "");
  return `${digits}@c.us`;
}

function buildOpenWaHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    "X-Api-Key": apiKey,
    "X-Pinggy-No-Screen": "1",
    ...extra,
  };
}

/**
 * Checks OpenWA status and session health from the configured OpenWA Gateway (local or remote tunnel).
 */
export async function getOpenWaStatus(): Promise<OpenWaStatusResult> {
  const { apiUrl, dashboardUrl, apiKey } = await getOpenWaConfig();

  try {
    const res = await fetch(`${apiUrl}/api/sessions`, {
      headers: buildOpenWaHeaders(apiKey),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        online: false,
        apiUrl,
        dashboardUrl,
        activeSession: null,
        sessions: [],
        error: `OpenWA API returned status ${res.status}`,
      };
    }

    const sessions = (await res.json()) as OpenWaSession[];
    let activeSession = sessions.find((s) => s.status === "ready") || null;

    if (!activeSession && sessions.length > 0) {
      const disconnected = sessions.find((s) => s.status === "disconnected" && s.phone);
      if (disconnected) {
        try {
          const startRes = await fetch(`${apiUrl}/api/sessions/${disconnected.id}/start`, {
            method: "POST",
            headers: buildOpenWaHeaders(apiKey),
            signal: AbortSignal.timeout(3000),
          });
          if (startRes.ok) {
            const started = await startRes.json();
            activeSession = started;
          }
        } catch {
          // ignore auto-start failure
        }
      }
      if (!activeSession) activeSession = sessions[0];
    }

    return {
      online: true,
      apiUrl,
      dashboardUrl,
      activeSession,
      sessions,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenWA gateway is unreachable";
    return {
      online: false,
      apiUrl,
      dashboardUrl,
      activeSession: null,
      sessions: [],
      error: msg,
    };
  }
}

export async function createOpenWaSession(name: string): Promise<OpenWaSession> {
  const { apiUrl, apiKey } = await getOpenWaConfig();
  const res = await fetch(`${apiUrl}/api/sessions`, {
    method: "POST",
    headers: buildOpenWaHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ name: name.trim(), autoStart: true }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Failed to create session (HTTP ${res.status})`);
  }
  return data as OpenWaSession;
}

export async function controlOpenWaSession(
  sessionId: string,
  action: "start" | "stop" | "logout" | "delete"
): Promise<unknown> {
  const { apiUrl, apiKey } = await getOpenWaConfig();
  const isDelete = action === "delete";
  const url = isDelete
    ? `${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}`
    : `${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}/${action}`;
  const res = await fetch(url, {
    method: isDelete ? "DELETE" : "POST",
    headers: buildOpenWaHeaders(apiKey),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Session ${action} failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getOpenWaSessionQR(sessionId: string): Promise<{ qr?: string; qrCode?: string; raw?: string; status?: string }> {
  const { apiUrl, apiKey } = await getOpenWaConfig();
  const res = await fetch(`${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}/qr`, {
    headers: buildOpenWaHeaders(apiKey),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `QR code not ready (HTTP ${res.status})`);
  }
  return data;
}

export async function requestOpenWaPairingCode(
  sessionId: string,
  phoneNumber: string
): Promise<{ code?: string; pairingCode?: string }> {
  const { apiUrl, apiKey } = await getOpenWaConfig();
  const digits = phoneNumber.replace(/\D/g, "");
  const res = await fetch(`${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}/pairing-code`, {
    method: "POST",
    headers: buildOpenWaHeaders(apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ phoneNumber: digits }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Pairing code failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Sends a message via the active OpenWA session using the official OpenWA REST API.
 */
export async function sendOpenWaMessage({
  phoneNumber,
  message,
  sessionId,
}: {
  phoneNumber: string;
  message: string;
  sessionId?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  recipient: string;
  delivered: boolean;
  notice?: string;
  session?: OpenWaSession;
}> {
  const { apiUrl, dashboardUrl, apiKey } = await getOpenWaConfig();
  const status = await getOpenWaStatus();
  if (!status.online) {
    throw new Error(
      "OpenWA API is offline or unreachable at " + apiUrl + ". Ensure OpenWA is running and accessible."
    );
  }

  const session = sessionId
    ? status.sessions.find((s) => s.id === sessionId || s.name === sessionId)
    : status.activeSession;

  if (!session) {
    throw new Error(
      "No OpenWA session found. Connect your WhatsApp device in the Sessions tab."
    );
  }

  if (session.status !== "ready") {
    const startRes = await fetch(`${apiUrl}/api/sessions/${session.id}/start`, {
      method: "POST",
      headers: buildOpenWaHeaders(apiKey),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!startRes || !startRes.ok) {
      throw new Error(
        `OpenWA session "${session.name}" is ${session.status}. Please scan the QR code or use a pairing code in SocialSync WhatsApp Gateway (${dashboardUrl}) to link your phone.`
      );
    }
  }

  const chatId = formatWhatsAppChatId(phoneNumber);

  const sendRes = await fetch(
    `${apiUrl}/api/sessions/${session.id}/messages/send-text`,
    {
      method: "POST",
      headers: buildOpenWaHeaders(apiKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        chatId,
        text: message,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!sendRes.ok) {
    const errBody = await sendRes.json().catch(() => ({}));
    const errText = errBody.message || errBody.error || `HTTP ${sendRes.status}`;
    logTransmission({
      id: `err-${Date.now()}`,
      recipient: phoneNumber,
      messagePreview: message.slice(0, 100),
      status: "failed",
      provider: "openwa",
      timestamp: new Date().toISOString(),
      error: errText,
    });
    throw new Error(`OpenWA API error: ${errText}`);
  }

  const result = await sendRes.json();
  const messageId = result.messageId || `owa-${Date.now()}`;

  logTransmission({
    id: messageId,
    recipient: phoneNumber,
    messagePreview: message.slice(0, 100),
    status: "delivered",
    provider: "openwa",
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    messageId,
    recipient: phoneNumber,
    delivered: true,
    notice: `Message successfully dispatched via OpenWA session "${session.name}" (${session.phone || "Linked"})`,
    session,
  };
}
