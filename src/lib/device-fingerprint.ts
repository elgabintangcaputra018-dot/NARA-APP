/**
 * Device Fingerprinting & Identification for Nara App
 * Generates a stable unique device_id and human-friendly device_name
 */

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
}

// Simple deterministic hash algorithm (djb2 / murmur-style)
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function getDeviceName(): string {
  if (typeof window === "undefined") {
    return "Perangkat Tidak Dikenal";
  }

  const ua = navigator.userAgent;
  let browser = "Browser";
  let os = "Perangkat";

  // Detect Browser
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browser = "Opera";
  }

  // Detect OS
  if (ua.includes("Windows NT 10.0") || ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("iPhone")) {
    os = "iPhone";
  } else if (ua.includes("iPad")) {
    os = "iPad";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("Macintosh") || ua.includes("Mac OS")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return `${browser} di ${os}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-device-id";
  }

  const STORAGE_KEY = "nara_device_uuid";
  let deviceUuid = localStorage.getItem(STORAGE_KEY);

  if (!deviceUuid) {
    // Generate UUID if not present
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceUuid = crypto.randomUUID();
    } else {
      deviceUuid = "nara-dev-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    try {
      localStorage.setItem(STORAGE_KEY, deviceUuid);
    } catch {
      // Ignore quota error if any
    }
  }

  // Combine user agent, screen resolution, timezone, colorDepth, and persistent UUID
  const rawFingerprint = [
    deviceUuid,
    navigator.userAgent,
    window.screen?.width || 0,
    window.screen?.height || 0,
    window.screen?.colorDepth || 0,
    Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || "UTC",
    navigator.language || "",
  ].join("|");

  return `dev_${hashString(rawFingerprint)}_${deviceUuid.substring(0, 8)}`;
}

export function getDeviceInfo(): DeviceInfo {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
  };
}
