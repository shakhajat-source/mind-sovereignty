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
                      built, backed by an architecture engineered to keep you hooked. If you find
                      yourself endlessly scrolling, it isn't a personal failure or a lack of
                      discipline — it's the logical outcome of an unfair fight. Our brains simply
                      weren't made for this level of over-saturation. The constant flood of cheap
                      dopamine throws our emotions out of balance, leading to unpredictable mood
                      swings, fractured focus, eroded sleep, and a loss of time for the things
                      that truly fulfil us.
                    </p>
                    <p className="text-base text-neutral-800 font-light leading-relaxed">
                      You likely already feel these consequences, but how do you fight back
                      against a system designed to keep you addicted? It starts with our short
                      quiz, which gives you personalised, targeted advice based on your specific
                      habits. From there, we guide you through a step-by-step recovery plan,
                      equipping you with practical tools designed to help you along the way. We
                      focus on building the right friction to dismantle your digital loops —
                      relying on proven strategy, not exhausting willpower.
                    </p>
                    <p className="text-base text-neutral-800 font-light leading-relaxed">
                      Rewiring your habits won't happen overnight, but we have one massive
                      advantage over the tech companies.{' '}
                      <strong className="font-extrabold text-neutral-900">
                        Real life — for all its messy, unpredictable flaws — is simply better
                        than the scroll.
                      </strong>
                      {' '}It's time to keep your phone in check, reclaim your attention, and
                      get back to living.
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
