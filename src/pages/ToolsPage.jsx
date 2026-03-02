import React from 'react';

export default function ToolsPage() {
  const tools = [
    {
      title: "The Sovereignty Lockbox",
      subheader: "Physical Habit Correction",
      description: "Remove the variable of willpower. Our hardware solution force-corrects negative usage patterns by physically securing your device during high-focus windows."
    },
    {
      title: "The Sovereign Blocker",
      subheader: "Digital Infrastructure",
      description: "A cross-platform app and browser extension engineered to block non-essential distractions. Features an optional 'Emergency Bypass Tax' where a charitable donation is required to break a scheduled focus block."
    },
    {
      title: "Psychological Assessment & 1-1",
      subheader: "Human Support Systems",
      description: "A deeper diagnostic of your specific attention triggers. Includes weekly sessions with therapists specialized in digital addiction and neural recovery to identify and solve underlying patterns."
    },
    {
      title: "Personal Assistant Buffer",
      subheader: "Communication Infrastructure",
      description: "A temporary personalized OOO service for your life. We act as a human filter for your messaging and email, ensuring only true emergencies reach you while you remain focused on what matters."
    },
    {
      title: "7 & 14-Day Detox Courses",
      subheader: "Total Neurological Reset",
      description: "Comprehensive recovery in a relaxing, distraction-free environment. A guided dopamine reset designed to facilitate a complete break from digital dependency and a return to sensory presence."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F2F0ED] pt-32 pb-24 px-6 md:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <p className="text-xs tracking-widest uppercase text-emerald-600 font-bold mb-3">Accelerator Suite</p>
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tighter">Everything you need to take back control.</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <div key={index} className="bg-white border border-[#1A1A1A] p-10 flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">{tool.subheader}</p>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight mb-4">{tool.title}</h2>
                <p className="text-sm text-neutral-600 font-light leading-relaxed mb-8">{tool.description}</p>
              </div>
              <button className="self-start text-[11px] font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-4 transition-all">
                Learn More <span className="text-lg">→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}