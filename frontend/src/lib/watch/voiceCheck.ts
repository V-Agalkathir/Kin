// Phase 4 — ask "Are you okay?" and listen for a reply. Returns true if the person answered.
// TODO(A): localize prompt per parent's language; consider keyword match instead of any speech.
export async function voiceCheck(prompt: string, lang = "en-US", listenMs = 20_000): Promise<boolean> {
  speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(prompt), { lang }));
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return false;
  return new Promise((resolve) => {
    const rec = new SR();
    rec.lang = lang;
    let heard = false;
    rec.onresult = () => { heard = true; rec.stop(); };
    rec.onend = () => resolve(heard);
    setTimeout(() => rec.stop(), listenMs);
    rec.start();
  });
}
