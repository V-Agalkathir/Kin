import { useEffect, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getPoseLandmarker } from "../lib/pose/landmarker";

type Props = { onLandmarks: (lm: NormalizedLandmark[], tMs: number) => void };

// Webcam + skeleton overlay. Video never leaves the browser.
export default function PoseCamera({ onLandmarks }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0; let stream: MediaStream | null = null;
    (async () => {
      const landmarker = await getPoseLandmarker();
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current!; video.srcObject = stream; await video.play();
      const ctx = canvasRef.current!.getContext("2d")!;
      const loop = () => {
        const t = performance.now();
        const res = landmarker.detectForVideo(video, t);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const lm = res.landmarks[0];
        if (lm) {
          ctx.fillStyle = "#0ea5e9";
          lm.forEach((p) => ctx.fillRect(p.x * ctx.canvas.width - 3, p.y * ctx.canvas.height - 3, 6, 6));
          onLandmarks(lm, t);
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();
    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onLandmarks]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} width={640} height={360} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
