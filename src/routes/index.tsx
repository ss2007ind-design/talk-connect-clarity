import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SocialSync — A gentle social translator" },
      { name: "description", content: "Real-time mood, topic, and reply help for autistic users on video calls and chats." },
    ],
  }),
  component: Home,
});

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="group relative rounded-3xl border border-border/70 bg-card p-7 shadow-soft hover:shadow-warm transition">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-warm text-2xl">{icon}</div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Home() {
  return (
    <div className="grain">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-warm opacity-60" />
        <div className="absolute -top-32 -right-32 -z-10 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 -z-10 h-96 w-96 rounded-full bg-blush/40 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Built with the autistic community in mind
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              The kindest{" "}
              <span className="italic text-accent">social translator</span>{" "}
              you'll ever meet.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75">
              SocialSync listens to your conversations in real time and gently whispers what to say,
              how the other person feels, and what's really being meant — so connection feels easier.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/call"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-warm hover:scale-[1.02] transition"
              >
                🎥 Start a live call
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/decode"
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-card px-7 py-3.5 text-sm font-semibold text-foreground hover:border-primary/40 transition"
              >
                📸 Decode a chat screenshot
              </Link>
            </div>
          </div>

          {/* Floating preview card */}
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-card p-5 shadow-soft animate-float">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mood</div>
              <div className="mt-2 flex items-center gap-2 text-2xl">😊 <span className="font-display text-lg">Sincere</span></div>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-soft animate-float [animation-delay:0.4s]">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Topic</div>
              <div className="mt-2 font-display text-lg">Weekend plans</div>
            </div>
            <div className="rounded-2xl bg-gradient-cocoa p-5 text-primary-foreground shadow-warm animate-float [animation-delay:0.8s]">
              <div className="text-xs font-medium uppercase tracking-wider opacity-70">Try saying</div>
              <div className="mt-2 font-display text-lg italic">"That sounds fun — tell me more!"</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold sm:text-5xl">Two modes. One calm companion.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're in a live call or trying to decode that confusing text — SocialSync is right there with you.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Feature icon="🎥" title="Live Call Assistant" body="Real-time webcam + microphone. As the conversation flows, SocialSync detects the other person's mood, tracks the topic, and gently suggests what you could say next." />
          <Feature icon="📸" title="Chat Screenshot Decoder" body="Upload a confusing chat. We read every message, explain the topic, decode hidden meaning or sarcasm, and offer replies in different tones." />
          <Feature icon="🧭" title="Stay-on-topic alerts" body="If the conversation drifts, a soft pop-up reminds you of the main point so you don't lose the thread." />
          <Feature icon="💛" title="Tone-aware suggestions" body="Every suggestion comes labeled with its tone — friendly, polite, supportive — so you can pick what fits you." />
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">The humans behind it</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "Tanishka Bansal", r: "Project Lead & Researcher", d: "Researches cultures and social situations so the advice always lands kindly." },
              { n: "Sharmishtha Saha", r: "AI Developer", d: "Builds the AI that reads moods and tracks the conversation in real time." },
              { n: "Priyanshi Srivastava", r: "Designer & Writer", d: "Makes the app calm to look at — and writes every alert in plain, easy English." },
            ].map((m) => (
              <div key={m.n} className="rounded-2xl border border-border/70 bg-card p-6">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-gradient-sunset font-display text-lg font-semibold text-primary-foreground">
                  {m.n[0]}
                </div>
                <div className="font-display text-lg font-semibold">{m.n}</div>
                <div className="text-xs uppercase tracking-wider text-accent mt-0.5">{m.r}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl font-semibold sm:text-5xl text-balance">
          Ready to feel a little more <span className="italic text-accent">at ease</span>?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/call" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-warm hover:scale-[1.02] transition">
            Start a live call →
          </Link>
        </div>
      </section>
    </div>
  );
}
