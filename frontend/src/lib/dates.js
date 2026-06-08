// Helpers for dates
import { format, startOfWeek, addDays, parseISO, getDay, startOfMonth, endOfMonth, eachDayOfInterval, getISOWeek, startOfYear, endOfYear } from "date-fns";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isoDate(d) { return format(d, "yyyy-MM-dd"); }
export function todayIso() { return isoDate(new Date()); }

// 0=Mon ... 6=Sun (matches DAY_NAMES)
export function dayOfWeekIso(d) {
  const js = getDay(d); // 0=Sun ... 6=Sat
  return (js + 6) % 7;
}

export function weekStart(d) { return startOfWeek(d, { weekStartsOn: 1 }); }
export function weekDays(d) {
  const s = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

// Get tasks for a specific date (combining recurring + once)
export function tasksForDate(tasks, date) {
  const iso = isoDate(date);
  const dow = dayOfWeekIso(date);
  return tasks.filter((t) => {
    if (t.recurrence === "weekly" && t.day_of_week === dow) return true;
    if (t.recurrence === "once" && t.date === iso) return true;
    return false;
  });
}

export function completionKey(task_id, dateIso) { return `${task_id}:${dateIso}`; }

export function isCompleted(completions, task_id, dateIso) {
  return completions.some((c) => c.task_id === task_id && c.date === dateIso);
}

export {
  format, startOfWeek, addDays, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, getISOWeek, startOfYear, endOfYear,
};
