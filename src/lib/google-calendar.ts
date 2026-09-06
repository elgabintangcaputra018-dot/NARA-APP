/**
 * Google Calendar API Client & Conflict Detection for Nara App
 * Supports both real Google Calendar API v3 and local simulated mode for development.
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
}

export interface ScheduleConflict {
  sessionId: string;
  sessionTitle: string;
  conflictingEventTitle: string;
  eventStart: string;
  eventEnd: string;
  conflictType: "overlap";
}

export function isGoogleCalendarConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientSecret && !clientId.includes("your-client-id"));
}

export function getGoogleOAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "nara-mock-client-id";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";
  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar");

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(
    state
  )}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  if (!isGoogleCalendarConfigured()) {
    // Simulated token for development and testing
    return {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: `mock_refresh_token_${Date.now()}`,
      expires_in: 3600,
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Gagal menukar token Google");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description: string;
    startTime: string;
    durationMinutes: number;
  }
): Promise<{ id: string }> {
  const start = new Date(event.startTime);
  const end = new Date(start.getTime() + event.durationMinutes * 60 * 1000);

  if (!isGoogleCalendarConfigured() || accessToken.startsWith("mock_")) {
    return { id: `gcal_event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Gagal membuat agenda di Google Calendar");
  }

  return { id: data.id };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  if (!isGoogleCalendarConfigured() || accessToken.startsWith("mock_")) {
    // Provide simulated sample calendar events for testing conflict detection
    const now = new Date();
    const mockEvents: GoogleCalendarEvent[] = [
      {
        id: "mock_gcal_1",
        summary: "Simulasi OSN / Tryout Sekolah",
        start: { dateTime: new Date(now.getTime() + 86400000 * 2 + 3600000 * 9).toISOString() },
        end: { dateTime: new Date(now.getTime() + 86400000 * 2 + 3600000 * 11).toISOString() },
      },
    ];
    return mockEvents;
  }

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Gagal mengambil agenda dari Google Calendar");
  }

  return (data.items || []).map(
    (item: {
      id: string;
      summary?: string;
      description?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
    }) => ({
      id: item.id,
      summary: item.summary || "Agenda Kalender",
      description: item.description,
      start: item.start,
      end: item.end,
    })
  );
}

/**
 * Pure Mathematical Conflict Detection Algorithm
 * Checks overlap: max(startA, startB) < min(endA, endB)
 */
export function detectScheduleConflicts(
  sessions: Array<{ id: string; title: string; start_time: string; duration_minutes: number }>,
  calendarEvents: GoogleCalendarEvent[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (const session of sessions) {
    const sessStart = new Date(session.start_time).getTime();
    const sessEnd = sessStart + session.duration_minutes * 60 * 1000;

    for (const event of calendarEvents) {
      const eventStartStr = event.start.dateTime || event.start.timeZone;
      const eventEndStr = event.end.dateTime || event.end.timeZone;
      if (!eventStartStr || !eventEndStr) continue;

      const eventStart = new Date(eventStartStr).getTime();
      const eventEnd = new Date(eventEndStr).getTime();

      // Check for overlap
      const maxStart = Math.max(sessStart, eventStart);
      const minEnd = Math.min(sessEnd, eventEnd);

      if (maxStart < minEnd) {
        conflicts.push({
          sessionId: session.id,
          sessionTitle: session.title,
          conflictingEventTitle: event.summary,
          eventStart: new Date(eventStart).toISOString(),
          eventEnd: new Date(eventEnd).toISOString(),
          conflictType: "overlap",
        });
      }
    }
  }

  return conflicts;
}
