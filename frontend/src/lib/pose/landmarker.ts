import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let instance: PoseLandmarker | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (instance) return instance;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  instance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  return instance;
}

// Landmark indices live in geometry.ts so pure code can use them without loading MediaPipe.
export { LM } from "./geometry";
