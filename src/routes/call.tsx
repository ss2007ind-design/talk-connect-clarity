import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { analyzeConversation } from "@/server/ai.functions";

export const Route = createFileRoute("/call")({
  head: () => ({
    meta: [
      { title: "Live Call Assistant — SocialSync" },
      { name: "description", content: "Real-time mood detection, topic tracking, and reply suggestions during your video call." },
    ],
  }),
  component: CallPage,
});

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊", neutral: "😐", curious: "🤔", confused: "😕",
  frustrated: "😤", sad: "😔", excited: "🤩", sincere: "🙂", sarcastic: "😏",
};

type Analysis = {
  mood: string;
  moodReason: string;
  topic: string;
  offTopic: boolean;
  suggestions: string[];
  tip: string;
};

function CallPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interim, setInterim] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const lastAnalyzedRef = useRef<number>(0);
  const activeRef = useRef(false);

  const analyzeFn = useServerFn(analyzeConversation);

  useEffect(() => {
    const SR = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) setSupported(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setInterim("");

    if (!window.isSecureContext) {
      setError("Microphone access needs a secure HTTPS page.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support microphone access.");
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError("Live speech recognition needs Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (micPermission.state === "denied") {
          setError("Microphone is blocked. Click the 🔒 icon in your address bar, allow microphone access, then start again.");
          return;
        }
      }

      // Request the microphone by itself first, directly from the click handler.
      // This avoids the whole call failing when the camera is unavailable or blocked.
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack || audioTrack.readyState !== "live" || audioTrack.muted) {
        audioStream.getTracks().forEach((track) => track.stop());
        setError("Microphone connected, but no live audio is coming through. Check your browser/input settings.");
        return;
      }

      let videoStream: MediaStream | null = null;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        // Keep the assistant usable even if the camera is unavailable.
      }

      const s = new MediaStream([
        ...(videoStream?.getVideoTracks() ?? []),
        ...audioStream.getAudioTracks(),
      ]);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }

      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";
      r.maxAlternatives = 1;
      r.onstart = () => setError(null);
      r.onaudiostart = () => setError(null);
      r.onspeechstart = () => setInterim("Listening…");
      r.onresult = (e: any) => {
        let interimText = "";
        let finalAdd = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalAdd += t + " ";
          else interimText += t;
        }
        if (finalAdd) {
          transcriptRef.current = (transcriptRef.current + " " + finalAdd).trim();
          setTranscript(transcriptRef.current);
        }
        setInterim(interimText);
      };
      r.onerror = (e: any) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Speech recognition is blocked. Allow microphone access in the browser, then start again.");
        } else if (e.error === "audio-capture") {
          setError("No microphone input detected. Choose the correct input device in browser settings.");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
          setError(`Speech recognition: ${e.error}`);
        }
      };
      r.onend = () => {
        if (activeRef.current && recogRef.current === r) {
          window.setTimeout(() => {
            try { r.start(); } catch {}
          }, 250);
        }
      };

      activeRef.current = true;
      setActive(true);
      recogRef.current = r;
      r.start();
    } catch (e: any) {
      activeRef.current = false;
      if (recogRef.current) {
        const r = recogRef.current;
        recogRef.current = null;
        try { r.stop(); } catch {}
      }
      if (e?.name === "NotAllowedError") {
        setError("Microphone permission denied. Allow microphone access in your browser and try again.");
      } else if (e?.name === "NotFoundError") {
        setError("No microphone found. Connect a mic or choose the correct input device.");
      } else if (e?.name === "NotReadableError") {
        setError("Your microphone is being used by another app. Close it and try again.");
      } else {
        setError(e?.message || "Could not access the microphone");
      }
    }
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (recogRef.current) {
      const r = recogRef.current;
      recogRef.current = null;
      try { r.stop(); } catch {}
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setActive(false);
    setInterim("");
  }, [stream]);

  useEffect(() => () => stop(), []); // eslint-disable-line

  // Auto-analyze every 8s when there's enough new content
  useEffect(() => {
    if (!active) return;
    const id = setInterval(async () => {
      const now = Date.now();
      const t = transcriptRef.current;
      if (!t || t.length < 30) return;
      if (now - lastAnalyzedRef.current < 7500) return;
      lastAnalyzedRef.current = now;
      setAnalyzing(true);
      try {
        const res = await analyzeFn({ data: { transcript: t } });
        setAnalysis(res as Analysis);
      } catch (e: any) {
        setError(e?.message || "Analysis failed");
      } finally {
        setAnalyzing(false);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [active, analyzeFn]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Live Call Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">SocialSync listens in real time and gently helps with what to say next.</p>
      </div>

      {!supported && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          ⚠️ Live speech recognition needs Chrome, Edge, or Safari. Some features won't work in this browser.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Video panel */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-cocoa shadow-warm aspect-video">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            {!active && (
              <div className="absolute inset-0 grid place-items-center text-center text-primary-foreground/90 p-6">
                <div>
                  <div className="mb-3 text-5xl">🎥</div>
                  <p className="font-display text-2xl">Camera & mic are off</p>
                  <p className="mt-1 text-sm opacity-70">Click below to start the assistant.</p>
                </div>
              </div>
            )}
            {active && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> LIVE
              </div>
            )}
            {active && analyzing && (
              <div className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Thinking…
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!active ? (
              <button
                onClick={start}
                className="flex-1 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-warm hover:scale-[1.01] transition"
              >
                ▶  Start camera & mic
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex-1 rounded-full bg-destructive px-6 py-3.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 transition"
              >
                ■  End call
              </button>
            )}
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Transcript</div>
              {transcript && (
                <button
                  onClick={() => { transcriptRef.current = ""; setTranscript(""); setInterim(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto text-sm leading-relaxed">
              {transcript ? <span>{transcript}</span> : <span className="text-muted-foreground italic">Speak — words appear here in real time.</span>}
              {interim && <span className="text-muted-foreground italic"> {interim}</span>}
            </div>
          </div>
        </div>

        {/* Insight panel */}
        <div className="space-y-4">
          {/* Mood */}
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Their Mood</div>
            {analysis ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-5xl">{MOOD_EMOJI[analysis.mood] || "🙂"}</span>
                  <span className="font-display text-2xl font-semibold capitalize">{analysis.mood}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{analysis.moodReason}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground italic">Waiting for the conversation to begin…</p>
            )}
          </div>

          {/* Topic */}
          <div className={`rounded-3xl border p-6 shadow-soft transition ${analysis?.offTopic ? "border-warm bg-warm/15" : "border-border/70 bg-card"}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {analysis?.offTopic ? "⚠️ Off-topic alert" : "Main Topic"}
              </div>
              {analysis?.offTopic && <span className="rounded-full bg-warm px-2 py-0.5 text-[10px] font-semibold text-warm-foreground">DRIFT</span>}
            </div>
            <div className="mt-3 font-display text-xl font-semibold">{analysis?.topic || "—"}</div>
            {analysis?.offTopic && <p className="mt-2 text-xs text-warm-foreground/80">Gently steer back: "Going back to what you were saying…"</p>}
          </div>

          {/* Suggestions */}
          <div className="rounded-3xl bg-gradient-cocoa p-6 text-primary-foreground shadow-warm">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">💬 Try saying</div>
            <div className="mt-3 space-y-2">
              {analysis?.suggestions?.length ? (
                analysis.suggestions.map((s, i) => (
                  <div key={i} className="rounded-2xl bg-card/10 px-4 py-3 text-sm leading-snug backdrop-blur-sm border border-card/10 hover:bg-card/15 transition cursor-default">
                    "{s}"
                  </div>
                ))
              ) : (
                <p className="text-sm opacity-70 italic">Suggestions appear once you start chatting.</p>
              )}
            </div>
          </div>

          {/* Tip */}
          {analysis?.tip && (
            <div className="rounded-3xl border border-sage/40 bg-sage/15 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-sage-foreground">💡 Social tip</div>
              <p className="mt-2 text-sm text-sage-foreground">{analysis.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
