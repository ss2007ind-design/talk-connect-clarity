import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback, useRef } from "react";
import { analyzeScreenshot } from "@/server/ai.functions";

export const Route = createFileRoute("/decode")({
  head: () => ({
    meta: [
      { title: "Decode a Chat Screenshot — SocialSync" },
      { name: "description", content: "Upload a confusing chat. SocialSync explains the topic, decodes hidden meaning, and suggests replies in different tones." },
    ],
  }),
  component: DecodePage,
});

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊", neutral: "😐", curious: "🤔", confused: "😕",
  frustrated: "😤", sad: "😔", excited: "🤩", sincere: "🙂", sarcastic: "😏", unclear: "❓",
};

const TONE_STYLES: Record<string, string> = {
  friendly: "bg-warm/30 text-warm-foreground border-warm/40",
  polite: "bg-secondary text-secondary-foreground border-border",
  enthusiastic: "bg-accent/20 text-foreground border-accent/40",
  neutral: "bg-muted text-muted-foreground border-border",
  supportive: "bg-sage/25 text-sage-foreground border-sage/40",
  curious: "bg-blush/30 text-blush-foreground border-blush/40",
};

type Result = {
  topic: string;
  summary: string;
  otherMood: string;
  hiddenMeaning: string;
  suggestions: { text: string; tone: string }[];
  warning: string;
};

function DecodePage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeFn = useServerFn(analyzeScreenshot);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    setError(null);
    setResult(null);
    const r = new FileReader();
    r.onload = () => setImageData(r.result as string);
    r.readAsDataURL(file);
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const decode = useCallback(async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeFn({ data: { imageBase64: imageData } });
      setResult(res as Result);
    } catch (e: any) {
      setError(e?.message || "Could not analyze screenshot");
    } finally {
      setLoading(false);
    }
  }, [imageData, analyzeFn]);

  const reset = () => { setImageData(null); setResult(null); setError(null); };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6" onPaste={onPaste}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Decode a Chat Screenshot</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload, drag, or paste (Ctrl+V) a chat. We'll explain it kindly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Upload panel */}
        <div>
          {!imageData ? (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="group cursor-pointer rounded-3xl border-2 border-dashed border-border bg-card hover:border-accent hover:bg-warm/10 transition p-12 text-center min-h-[400px] grid place-items-center"
            >
              <div>
                <div className="mb-4 text-6xl group-hover:scale-110 transition-transform">📸</div>
                <p className="font-display text-xl font-semibold">Drop a screenshot here</p>
                <p className="mt-2 text-sm text-muted-foreground">or click to browse · or paste with Ctrl+V</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
                <img src={imageData} alt="Chat screenshot" className="w-full max-h-[500px] object-contain bg-muted" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={decode}
                  disabled={loading}
                  className="flex-1 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-warm hover:scale-[1.01] transition disabled:opacity-60"
                >
                  {loading ? "Reading the chat…" : "✨ Decode this chat"}
                </button>
                <button onClick={reset} className="rounded-full border border-border bg-card px-5 py-3.5 text-sm font-medium hover:bg-secondary transition">
                  Reset
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="rounded-3xl border-2 border-dashed border-border/60 p-10 text-center text-muted-foreground">
              <div className="text-4xl mb-3">💭</div>
              <p>Your decoded chat will appear here.</p>
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {result && (
            <>
              {result.warning && (
                <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-destructive">⚠️ Heads up</div>
                  <p className="mt-2 text-sm">{result.warning}</p>
                </div>
              )}

              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📍 Topic</div>
                <div className="mt-2 font-display text-xl font-semibold">{result.topic}</div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{result.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Their Mood</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-3xl">{MOOD_EMOJI[result.otherMood] || "🙂"}</span>
                    <span className="font-display text-lg capitalize">{result.otherMood}</span>
                  </div>
                </div>
                <div className="rounded-3xl border border-blush/40 bg-blush/15 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-blush-foreground">🔍 Hidden meaning</div>
                  <p className="mt-2 text-sm text-blush-foreground leading-snug">{result.hiddenMeaning}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-cocoa p-6 text-primary-foreground shadow-warm">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-70">💬 Reply suggestions</div>
                <div className="mt-3 space-y-2.5">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="rounded-2xl bg-card/10 backdrop-blur-sm border border-card/10 p-4 hover:bg-card/15 transition">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-snug flex-1">"{s.text}"</p>
                        <button
                          onClick={() => copy(s.text, i)}
                          className="shrink-0 rounded-full bg-card/20 hover:bg-card/30 px-3 py-1 text-xs font-medium transition"
                        >
                          {copied === i ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TONE_STYLES[s.tone] || TONE_STYLES.neutral}`}>
                        {s.tone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
