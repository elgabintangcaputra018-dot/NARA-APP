import { SyllabusTopic, StudySession } from "./db";

export interface ScheduleOptions {
  studyHours?: {
    startHour: number; // e.g. 16 (16:00)
    endHour: number;   // e.g. 22 (22:00)
  };
  weeklyBufferPercent?: number; // default 0.15 (15%)
  startDate?: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ScheduledPlanResult {
  scheduledSessions: Array<{
    topic_id: string;
    topic_title: string;
    start_time: string;
    duration_minutes: number;
    weight: number;
    priority_score: number;
  }>;
  unallocatedTopics: Array<{
    topic_id: string;
    topic_title: string;
    weight: number;
    estimated_minutes: number;
    reason: string;
  }>;
  isOverloaded: boolean;
  warningMessage: string | null;
  totalAllocatedMinutes: number;
  totalBufferMinutesReserved: number;
}

// Helper: Get ISO Week Key (e.g. "2026-W36")
function getWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Pure Algorithmic Auto-Scheduler (No AI, 100% deterministic)
 */
export function generateAutoSchedule(
  topics: SyllabusTopic[],
  deadline: string | Date | null | undefined,
  existingSessions: StudySession[],
  options: ScheduleOptions = {}
): ScheduledPlanResult {
  const now = options.startDate ? new Date(options.startDate) : new Date();
  const studyStartHour = options.studyHours?.startHour ?? 16;
  const studyEndHour = options.studyHours?.endHour ?? 22;
  const bufferPercent = options.weeklyBufferPercent ?? 0.15; // 15% buffer

  // 1. Filter topics not yet completed
  const pendingTopics = topics.filter((t) => t.status !== "completed");
  if (pendingTopics.length === 0) {
    return {
      scheduledSessions: [],
      unallocatedTopics: [],
      isOverloaded: false,
      warningMessage: null,
      totalAllocatedMinutes: 0,
      totalBufferMinutesReserved: 0,
    };
  }

  // 2. Determine horizon & deadline
  const deadlineDate = deadline ? new Date(deadline) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30 days
  const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // 3. Compute Priority Score: score = weight * (1 / days_remaining)
  const scoredTopics = pendingTopics.map((topic) => {
    const daysLeft = Math.max(0.5, totalDays);
    const score = topic.weight * (1 / daysLeft);
    return {
      ...topic,
      priorityScore: score,
    };
  });

  // Sort descending by priorityScore, then order_index ascending
  scoredTopics.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.order_index - b.order_index;
  });

  // 4. Map existing busy intervals
  const busyIntervals: Array<{ start: number; end: number }> = existingSessions
    .filter((s) => s.status !== "cancelled")
    .map((s) => {
      const sStart = new Date(s.start_time).getTime();
      const sEnd = sStart + s.duration_minutes * 60 * 1000;
      return { start: sStart, end: sEnd };
    });

  // 5. Generate daily available study slots up to deadline
  // Track allocated minutes per week to maintain 15% buffer
  const weekAllocations: Record<string, { totalAvailableMin: number; allocatedMin: number }> = {};
  const availableSlots: TimeSlot[] = [];

  const cursorDate = new Date(now);
  cursorDate.setHours(0, 0, 0, 0);

  const horizonEndDate = new Date(deadlineDate);
  horizonEndDate.setHours(23, 59, 59, 999);

  while (cursorDate <= horizonEndDate) {
    const weekKey = getWeekKey(cursorDate);
    if (!weekAllocations[weekKey]) {
      weekAllocations[weekKey] = { totalAvailableMin: 0, allocatedMin: 0 };
    }

    const windowStart = new Date(cursorDate);
    windowStart.setHours(studyStartHour, 0, 0, 0);

    const windowEnd = new Date(cursorDate);
    windowEnd.setHours(studyEndHour, 0, 0, 0);

    // If current day is today, start slot after now + 15 mins buffer
    const effectiveStart = windowStart.getTime() < now.getTime()
      ? new Date(Math.max(windowStart.getTime(), now.getTime() + 15 * 60 * 1000))
      : windowStart;

    if (effectiveStart.getTime() < windowEnd.getTime()) {
      let slotStart = effectiveStart.getTime();
      const windowEndMs = windowEnd.getTime();

      // Find busy intervals in this window
      const dayBusy = busyIntervals
        .filter((b) => b.end > slotStart && b.start < windowEndMs)
        .sort((a, b) => a.start - b.start);

      for (const busy of dayBusy) {
        if (busy.start > slotStart) {
          const freeDurationMin = Math.floor((busy.start - slotStart) / (60 * 1000));
          if (freeDurationMin >= 30) {
            availableSlots.push({
              start: new Date(slotStart),
              end: new Date(busy.start),
              durationMinutes: freeDurationMin,
            });
            weekAllocations[weekKey].totalAvailableMin += freeDurationMin;
          }
        }
        slotStart = Math.max(slotStart, busy.end);
      }

      if (slotStart < windowEndMs) {
        const freeDurationMin = Math.floor((windowEndMs - slotStart) / (60 * 1000));
        if (freeDurationMin >= 30) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(windowEndMs),
            durationMinutes: freeDurationMin,
          });
          weekAllocations[weekKey].totalAvailableMin += freeDurationMin;
        }
      }
    }

    cursorDate.setDate(cursorDate.getDate() + 1);
  }

  // 6. Allocate topics to slots respecting weekly 15% buffer
  const scheduledSessions: ScheduledPlanResult["scheduledSessions"] = [];
  const unallocatedTopics: ScheduledPlanResult["unallocatedTopics"] = [];
  let totalAllocatedMinutes = 0;
  let totalBufferMinutesReserved = 0;

  for (const topic of scoredTopics) {
    const requiredMin = topic.estimated_minutes;
    let allocated = false;

    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const weekKey = getWeekKey(slot.start);
      const weekData = weekAllocations[weekKey];

      // Buffer rule: max allowed allocation per week = (1 - bufferPercent) * totalAvailableMin
      const maxAllowedInWeek = Math.floor((1 - bufferPercent) * (weekData?.totalAvailableMin || 0));
      const currentAllocatedInWeek = weekData?.allocatedMin || 0;

      // Check if slot fits duration and doesn't violate buffer
      if (slot.durationMinutes >= requiredMin && (currentAllocatedInWeek + requiredMin <= maxAllowedInWeek || currentAllocatedInWeek === 0)) {
        // Allocate session
        const sessionStartTime = new Date(slot.start);
        scheduledSessions.push({
          topic_id: topic.id,
          topic_title: topic.title,
          start_time: sessionStartTime.toISOString(),
          duration_minutes: requiredMin,
          weight: topic.weight,
          priority_score: Number(topic.priorityScore.toFixed(3)),
        });

        // Update tracking
        totalAllocatedMinutes += requiredMin;
        if (weekData) {
          weekData.allocatedMin += requiredMin;
        }

        // Split or shrink available slot
        if (slot.durationMinutes > requiredMin + 15) {
          slot.start = new Date(slot.start.getTime() + requiredMin * 60 * 1000);
          slot.durationMinutes -= requiredMin;
        } else {
          // Consume slot completely
          availableSlots.splice(i, 1);
        }

        allocated = true;
        break;
      }
    }

    if (!allocated) {
      unallocatedTopics.push({
        topic_id: topic.id,
        topic_title: topic.title,
        weight: topic.weight,
        estimated_minutes: topic.estimated_minutes,
        reason: "Kapasitas slot kalender atau batas buffer 15% sebelum tenggat waktu tidak mencukupi.",
      });
    }
  }

  // Calculate total buffer minutes reserved across weeks
  for (const w of Object.values(weekAllocations)) {
    const bufferMin = Math.round(w.totalAvailableMin * bufferPercent);
    totalBufferMinutesReserved += bufferMin;
  }

  const isOverloaded = unallocatedTopics.length > 0;
  const warningMessage = isOverloaded
    ? `Jadwal terlalu padat, ${unallocatedTopics.length} topik tidak akan selesai tepat waktu.`
    : null;

  return {
    scheduledSessions,
    unallocatedTopics,
    isOverloaded,
    warningMessage,
    totalAllocatedMinutes,
    totalBufferMinutesReserved,
  };
}
