import { Activity, ActivityHistoryEntry, CarbonFootprint } from "@/types";

const ACTIVITIES_KEY = "carbon_tracker_activities";
const FOOTPRINTS_KEY = "carbon_tracker_footprints";
const HISTORY_KEY = "carbon_tracker_activity_history";

const isBrowser = () => typeof window !== "undefined";

function readList<T>(key: string): T[] {
  if (!isBrowser()) return [];

  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, data: T[]) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

export const saveActivity = async (activity: Omit<Activity, "id">) => {
  const existing = readList<(Omit<Activity, "id"> & { id: string }) | (Omit<Activity, "id"> & { id?: string })>(ACTIVITIES_KEY);
  const next = [...existing, { ...activity, id: Date.now().toString() }];
  writeList(ACTIVITIES_KEY, next);
};

export const saveCarbonFootprint = async (footprint: CarbonFootprint) => {
  const existing = readList<CarbonFootprint>(FOOTPRINTS_KEY);
  const next = [...existing, footprint];
  writeList(FOOTPRINTS_KEY, next);
};

export const getUserFootprints = async (
  userId: string,
  days = 30
): Promise<CarbonFootprint[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const footprints = readList<Omit<CarbonFootprint, "date"> & { date: string | Date }>(FOOTPRINTS_KEY)
    .map((entry) => ({
      ...entry,
      date: new Date(entry.date),
    }))
    .filter((entry) => entry.userId === userId && entry.date >= startDate)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return footprints;
};

type StoredHistoryEntry = ActivityHistoryEntry & {
  userId: string;
  timestamp: string | Date;
};

export const saveActivityHistoryEntry = async (
  userId: string,
  entry: ActivityHistoryEntry
) => {
  const existing = readList<StoredHistoryEntry>(HISTORY_KEY);
  const next = [...existing, { ...entry, userId }];
  writeList(HISTORY_KEY, next);
};

export const getUserActivityHistory = async (
  userId: string
): Promise<ActivityHistoryEntry[]> => {
  const entries = readList<StoredHistoryEntry>(HISTORY_KEY)
    .filter((entry) => entry.userId === userId)
    .map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return entries;
};
