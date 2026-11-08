export type Pt = { x: number; y: number };
export type Landmark = Pt & { visibility?: number };

// MediaPipe pose landmark indices
export const LM = { L_SHOULDER: 11, R_SHOULDER: 12, L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28 };

/** A leg is used only if its hip, knee and ankle are all at least this visible. */
export const MIN_VISIBILITY = 0.5;

/** Angle at b (degrees) formed by a-b-c. */
export function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

function legAngle(lm: Landmark[], hip: number, knee: number, ankle: number): number | null {
  const pts = [lm[hip], lm[knee], lm[ankle]];
  if (pts.some((p) => !p || (p.visibility ?? 1) < MIN_VISIBILITY)) return null;
  return angleDeg(pts[0], pts[1], pts[2]);
}

/**
 * Hip–knee–ankle angle averaged over both legs. If only one leg is visible
 * (common when the camera is side-on), that leg's angle is used. Null if neither is.
 */
export function kneeAngleDeg(lm: Landmark[]): number | null {
  const angles = [
    legAngle(lm, LM.L_HIP, LM.L_KNEE, LM.L_ANKLE),
    legAngle(lm, LM.R_HIP, LM.R_KNEE, LM.R_ANKLE),
  ].filter((a): a is number => a !== null);
  if (angles.length === 0) return null;
  return angles.reduce((s, a) => s + a, 0) / angles.length;
}
