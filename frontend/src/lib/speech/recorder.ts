// Records ~30s of audio from the mic. Audio goes to the backend for transcription and is then deleted.
export async function recordAudio(ms = 30_000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType }));
    };
  });
  rec.start();
  setTimeout(() => rec.stop(), ms);
  return done;
}
