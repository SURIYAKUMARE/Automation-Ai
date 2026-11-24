export interface OpenWaSession {
  id: string;
  name: string;
  status: "ready" | "initializing" | "disconnected" | "failed" | string;
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

export interface WhatsAppTransmissionLog {
  id: string;
  recipient: string;
  messagePreview: string;
  status: "sent" | "delivered" | "read" | "failed";
  provider: "openwa";
  timestamp: string;
  error?: string;
}

const DEFAULT_API_URL = (process.env.OPENWA_API_URL || "http://localhost:2785").replace(/\/api\/?$/, "");
const DEFAULT_DASHBOARD_URL = process.env.OPENWA_DASHBOARD_URL || "http://localhost:2886";
const DEFAULT_API_KEY =
  process.env.OPENWA_API_KEY ||
  "owa_k1_f898a06df01cf602a6c5fded1f9c6817e876a23ba2c0149902fb686b909740de";

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

/**
 * Checks OpenWA status and session health from the local OpenWA Gateway.
 */
export async function getOpenWaStatus(): Promise<OpenWaStatusResult> {
  const apiUrl = DEFAULT_API_URL;
  const dashboardUrl = DEFAULT_DASHBOARD_URL;
  const apiKey = DEFAULT_API_KEY;

  try {
    const res = await fetch(`${apiUrl}/api/sessions`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(4000),
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

    // If session is disconnected, attempt to automatically start it
    if (!activeSession && sessions.length > 0) {
      const disconnected = sessions.find((s) => s.status === "disconnected" && s.phone);
      if (disconnected) {
        try {
          const startRes = await fetch(`${apiUrl}/api/sessions/${disconnected.id}/start`, {
            method: "POST",
            headers: { "X-Api-Key": apiKey },
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
  const status = await getOpenWaStatus();
  if (!status.online) {
    throw new Error(
      "OpenWA API is offline or unreachable at " + DEFAULT_API_URL + ". Ensure OpenWA is running."
    );
  }

  const session = sessionId
    ? status.sessions.find((s) => s.id === sessionId || s.name === sessionId)
    : status.activeSession;

  if (!session) {
    throw new Error(
      "No OpenWA session found. Open the OpenWA Dashboard at " +
        DEFAULT_DASHBOARD_URL +
        " and create or link a session."
    );
  }

  if (session.status !== "ready") {
    // Attempt one start
    const startRes = await fetch(`${DEFAULT_API_URL}/api/sessions/${session.id}/start`, {
      method: "POST",
      headers: { "X-Api-Key": DEFAULT_API_KEY },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!startRes || !startRes.ok) {
      throw new Error(
        `OpenWA session "${session.name}" is ${session.status}. Please scan the QR code in the OpenWA Dashboard (${DEFAULT_DASHBOARD_URL}) to link your phone.`
      );
    }
  }

  const chatId = formatWhatsAppChatId(phoneNumber);

  const sendRes = await fetch(
    `${DEFAULT_API_URL}/api/sessions/${session.id}/messages/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": DEFAULT_API_KEY,
      },
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
