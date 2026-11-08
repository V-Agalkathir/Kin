// Phase 1 has no auth: everyone is the demo parent. Replace with the signed-in profile in Phase 2.
import type { FamilyContact, ParentProfile } from "../types/health";

export const DEMO_USER: ParentProfile = {
  id: "demo-parent",
  firstName: "Margaret",
  fullName: "Margaret Ellis",
  relation: "Mom",
  pronoun: "she",
  age: 78,
  city: "Portland, Oregon",
  timeZone: "America/Los_Angeles",
  distanceLabel: "1,240 miles away",
  phone: "+15035550142", // fictional 555 number
  language: "en",
  speechLang: "en-US",
};

export const DEMO_FAMILY_CONTACT: FamilyContact = { name: "Daniel", relation: "Son" };
