import heroImg from '../assets/hero-sunset.jpg.png'

export default function Hero({ onOpenQuiz }) {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">

      {/* ── Background image layer ─────────────────────────────────────────── */}
      <img
        src={heroImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />

      {/* ── Overlay — just enough to lift white text off the image ────────── */}
      <div className="absolute inset-0 bg-black/30 z-10" aria-hidden="true" />

      {/* ── Content layer ─────────────────────────────────────────────────── */}
      <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
        <h1 className="font-nunito font-black text-4xl md:text-6xl lg:text-7xl text-white leading-[0.9] tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          Reclaim your focus.<br />
          Break the habit.<br />
          Own your life.
        </h1>

        <div className="mt-12">
          <button
            onClick={onOpenQuiz}
            className="bg-[#1A1A1A] text-white py-4 px-10 rounded-sm text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:border-emerald-600 border border-transparent transition-colors duration-200"
          >
            Get Your Personalised Plan
          </button>
        </div>
      </div>

      {/* ── Scroll indicator — anchored to bottom of section ─────────────── */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/70">
          Scroll to Explore
        </p>
        <div className="w-px h-10 bg-white/40" />
      </div>

    </section>
  )
}
