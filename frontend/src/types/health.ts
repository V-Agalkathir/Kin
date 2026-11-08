// Frontend-only types for the wearable + care-plan features (mock data in Phase 1).
// NOT part of the shared CheckIn contract — propose to the backend before relying on them server-side.

export type ParentProfile = {
  id: string;
  firstName: string;
  fullName: string;
  relation: string;        // how the family member refers to them, e.g. "Mom"
  pronoun: "she" | "he" | "they";
  age: number;
  city: string;
  timeZone: string;        // IANA, for "local time there"
  distanceLabel: string;   // e.g. "1,240 miles away"
  phone: string;           // E.164, used for the call button
  language: string;        // BCP-47
  speechLang: string;      // for speech synthesis/recognition
};

export type FamilyContact = { name: string; relation: string };

/** One day of wearable data (e.g. synced from a watch via a health platform). */
export type DailyVitals = {
  date: string;            // ISO date (yyyy-mm-dd)
  restingHr: number;       // bpm
  bpSystolic: number;      // mmHg
  bpDiastolic: number;     // mmHg
  steps: number;
  sleepMin: number;
};

export type VitalKey = "restingHr" | "bloodPressure" | "steps" | "sleepMin";

/** What a recommendation can be measured against, if anything. */
export type CareTrack =
  | { kind: "stepsPerDay"; target: number }
  | { kind: "bpBelow"; systolic: number; diastolic: number }
  | { kind: "sleepAtLeast"; minutes: number }
  | { kind: "dailyCheckIn" };

export type CareRecommendation = {
  id: string;
  text: string;            // copied from the doctor's report, not written by Kin
  isNew: boolean;          // added in the latest report
  track?: CareTrack;
};

export type CareReport = {
  doctor: string;
  role: string;
  date: string;            // ISO date of the latest report
  previousDate?: string;
  nextAppointment?: string;
  recommendations: CareRecommendation[];
};
