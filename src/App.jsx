import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import QuizModal from './components/QuizModal'
import ToolsPage from './pages/ToolsPage'

export default function App() {
  const [quizOpen, setQuizOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F2F0ED] font-sans selection:bg-[#1A1A1A] selection:text-white">

      <Navbar />

      <Routes>
        <Route path="/" element={
          <>
            <Hero onOpenQuiz={() => setQuizOpen(true)} />

            {/* ── Our Mission ─────────────────────────────────────────────── */}
            <section id="our-mission" className="py-24 md:py-32 bg-[#F2F0ED]">
              <div className="max-w-6xl mx-auto px-6 md:px-16">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-20 items-start">

                  {/* Left — headline + accent */}
                  <div className="md:col-span-2 space-y-5">
                    <h2 className="font-sans font-bold text-4xl md:text-5xl text-neutral-900 tracking-tighter leading-tight">
                      Reclaim your free time.
                    </h2>
                    {/* Brand-green accent line */}
                    <div className="h-1 w-16 bg-emerald-600" />
                  </div>

                  {/* Right — body copy */}
                  <div className="md:col-span-3 space-y-6">
                    <p className="text-base text-neutral-800 font-light leading-relaxed">
                      The modern smartphone is the most successful attention-capture device ever
                      built. Behind every infinite scroll is a multi-billion dollar architecture
                      engineered to keep you there longer than you intended. You aren't failing;
                      the system is working exactly as designed.
                    </p>
                    <p className="text-base text-neutral-800 font-light leading-relaxed">
                      High daily screen time is not a lack of discipline — it is the logical
                      outcome of an uneven fight. But the consequences are real: fractured focus,
                      eroded sleep and lack of time to pursue the things that really fulfil us in
                      life. We don't care about your screen time "score." We care about the cost
                      of that time.
                    </p>
                    <p className="text-base text-neutral-800 font-light leading-relaxed">
                      <strong className="font-bold text-neutral-900">
                        Mind Sovereignty helps you keep your phone in check.
                      </strong>{' '}
                      We provide the science-backed protocols and personalised diagnostics needed
                      to dismantle these digital loops and return your focus to where it belongs.
                      Through our roadmap, we help you understand your unique digital triggers and
                      systematically build the friction needed to break free.{' '}
                      <strong className="font-extrabold text-neutral-900">
                        Not through willpower. Through strategy.
                      </strong>
                    </p>
                  </div>

                </div>
              </div>
            </section>

          </>
        } />

        <Route path="/tools" element={<ToolsPage />} />
      </Routes>

      <footer className="border-t border-neutral-200 px-8 py-12 text-center bg-white">
        <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-light">
          © 2026 Mind Sovereignty
        </p>
      </footer>

      <QuizModal isOpen={quizOpen} onClose={() => setQuizOpen(false)} />
    </div>
  )
}
