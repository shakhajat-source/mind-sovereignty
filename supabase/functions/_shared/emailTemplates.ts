/* ─────────────────────────────────────────────────────────────────────────────
   Shared email helpers for the Mind Sovereignty 28-day programme.
   Imported by: start-journey (Day 0) and process-daily-emails (Days 1–28).
───────────────────────────────────────────────────────────────────────────── */

const TOOLS_URL     = 'https://dopamine-heroo.vercel.app/tools'
const SITE_URL      = 'https://dopamine-heroo.vercel.app'
const DASHBOARD_URL = 'https://dopamine-heroo.vercel.app/dashboard'
const FROM_ADDRESS  = 'Mind Sovereignty <hello@dopaminerevival.com>'

export { FROM_ADDRESS }

/* ─────────────────────────────────────────────────────────────────────────────
   PROGRESS BAR
   14-dot representation: each dot ≈ 2 days. Day 0 renders empty.
   Example Day 14: [●●●●●●●○○○○○○○]
───────────────────────────────────────────────────────────────────────────── */
function buildProgressBar(day: number): string {
  const DOTS   = 14
  const filled = day === 0 ? 0 : Math.round((day / 28) * DOTS)
  const bar    = Array.from({ length: DOTS }, (_, i) => i < filled ? '●' : '○').join('')
  const pct    = Math.round((day / 28) * 100)

  const label = day === 0
    ? '28 days to go — starting today'
    : `Day&nbsp;${day}&nbsp;of&nbsp;28 &nbsp;·&nbsp; ${28 - day} day${28 - day !== 1 ? 's' : ''} remaining`

  return `
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="font-size:16px;letter-spacing:2px;color:#5c8260;font-family:monospace;padding-bottom:6px;white-space:nowrap;">
        [${bar}]
      </td>
      <td align="right" style="font-size:11px;color:#aaa;font-family:Inter,sans-serif;padding-bottom:6px;white-space:nowrap;">
        ${pct}%
      </td>
    </tr>
    <tr>
      <td colspan="2" style="font-size:11px;color:#888;font-family:Inter,sans-serif;">${label}</td>
    </tr>
  </table>`
}

/* ─────────────────────────────────────────────────────────────────────────────
   TEXT → HTML
   Converts plain-text body copy into email-safe HTML.
   Rules:
     • Double newline  → new paragraph block
     • Lines starting "• " → styled bullet (green dot, indented)
     • Any other line in a mixed block → regular paragraph
───────────────────────────────────────────────────────────────────────────── */
function textToHtml(text: string): string {
  const pStyle = [
    'margin:0 0 16px',
    'font-size:13px',
    'line-height:1.8',
    'color:#444',
    'font-family:Inter,sans-serif',
  ].join(';')

  const bulletStyle = [
    'margin:0 0 8px',
    'font-size:13px',
    'line-height:1.7',
    'color:#444',
    'font-family:Inter,sans-serif',
    'padding-left:18px',
    'position:relative',
  ].join(';')

  return text
    .trim()
    .split(/\n\n+/)
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n').filter(Boolean)

      return lines.map((line, i) => {
        const nextLine = lines[i + 1]

        if (line.startsWith('• ')) {
          return `<p style="${bulletStyle}"><span style="position:absolute;left:0;color:#5c8260;font-weight:700;">•</span>${line.slice(2)}</p>`
        }

        // Tighten bottom margin when the next line is a bullet (label before a list)
        const mb   = nextLine?.startsWith('• ') ? '6px' : '16px'
        const bold = line.endsWith(':') // "Tips to maintain your progress:" etc.

        return bold
          ? `<p style="margin:0 0 ${mb};font-size:13px;line-height:1.8;color:#2c2c2c;font-family:Inter,sans-serif;font-weight:700;">${line}</p>`
          : `<p style="margin:0 0 ${mb};font-size:13px;line-height:1.8;color:#444;font-family:Inter,sans-serif;">${line}</p>`
      }).join('')
    })
    .join('')
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL HTML WRAPPER
   Every email — Day 0 through Day 28 — goes through this function.
   Injects: progress bar, goal reminder, footer tools CTA, legal footer.
───────────────────────────────────────────────────────────────────────────── */
export function buildEmailHtml(params: {
  day:        number
  subject:    string
  bodyText:   string
  goal:       string | null
  ctaButton?: { text: string; url: string; description?: string }
}): string {
  const { day, subject, bodyText, goal, ctaButton } = params
  const year     = new Date().getFullYear()
  const bodyHtml = textToHtml(bodyText)

  // Strip emoji from subject to use as the H1 heading inside the email
  const heading = subject.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\s+/g, ' ').trim()

  const weekLabel =
    day === 0  ? 'Pre-Recovery Guide' :
    day <= 7   ? 'Week 1 — Battling the Instinct' :
    day <= 14  ? 'Week 2 — Tackling the Withdrawal' :
    day <= 21  ? 'Week 3 — Setting in Good Habits' :
                 'Week 4 — Consolidating'

  const goalCallout = goal ? `
  <tr><td style="padding:0 48px 24px;">
    <div style="border-left:3px solid #5c8260;padding:10px 16px;background:#f4f7f4;">
      <p style="margin:0;font-size:12px;line-height:1.65;color:#555;font-family:Inter,sans-serif;">
        Remember: every hour you reclaim goes towards
        <strong style="color:#2c2c2c;">${goal}</strong>.
      </p>
    </div>
  </td></tr>` : ''

  const ctaRow = ctaButton ? `
  <tr><td style="padding:32px 48px 40px;background:#1a1a1a;">
    <p style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,0.55);font-family:Inter,sans-serif;line-height:1.6;">
      ${day === 0 ? 'Your 28-day programme starts now.' : 'Need support staying on track?'}
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td>
        <a href="${ctaButton.url}"
           style="display:inline-block;background:#10b981;color:#000;font-family:Inter,sans-serif;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;padding:16px 36px;">
          ${ctaButton.text}
        </a>
      </td></tr>
    </table>
    ${ctaButton.description ? `
    <p style="margin:18px 0 0;font-size:12px;color:rgba(255,255,255,0.38);font-family:Inter,sans-serif;line-height:1.7;">
      ${ctaButton.description}
    </p>` : ''}
  </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f2f0ed;font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ed;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;">

  <!-- Header -->
  <tr><td style="padding:40px 48px 28px;border-bottom:1px solid #eeece9;">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;font-family:Inter,sans-serif;">Mind Sovereignty</p>
    <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c8260;font-family:Inter,sans-serif;font-weight:700;">${weekLabel}</p>
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#2c2c2c;font-family:Outfit,Inter,sans-serif;line-height:1.2;">${heading}</h1>
    ${buildProgressBar(day)}
  </td></tr>

  <!-- Body copy -->
  <tr><td style="padding:32px 48px 16px;border-bottom:1px solid #eeece9;">
    ${bodyHtml}
  </td></tr>

  <!-- Goal reminder (only when goal is set) -->
  ${goalCallout}

  <!-- Optional CTA button -->
  ${ctaRow}

  <!-- Persistent footer: tools link -->
  <tr><td style="padding:18px 48px;background:#f8f7f5;">
    <p style="margin:0;font-size:12px;line-height:1.65;color:#888;font-family:Inter,sans-serif;">
      Struggling to follow your plan?
      <a href="${TOOLS_URL}" style="color:#5c8260;font-weight:600;text-decoration:underline;">
        Click here for tools we provide to help keep you on track.
      </a>
    </p>
  </td></tr>

  <!-- Legal footer -->
  <tr><td style="padding:16px 48px 28px;border-top:1px solid #eeece9;">
    <p style="margin:0;font-size:11px;color:#bbb;font-family:Inter,sans-serif;line-height:1.6;">
      &copy; ${year} Mind Sovereignty &middot; You're receiving this as part of your 28-day recovery plan.<br/>
      <a href="${SITE_URL}" style="color:#bbb;text-decoration:none;">dopaminerevival.com</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOBBY TOOL RECOMMENDATIONS
   Used in the Day 0 pre-recovery email only.
   Falls back to a generic recommendation if no match is found.
───────────────────────────────────────────────────────────────────────────── */
export function getHobbyToolRecommendation(goal: string | null): string {
  if (!goal) {
    return 'We recommend grabbing whatever beginner physical tools you need for this hobby so they are sitting visible in your room.'
  }
  const g = goal.toLowerCase()

  if (/language|spanish|french|german|italian|japanese|mandarin|chinese|portuguese|arabic|korean|hindi/.test(g))
    return "We'd recommend Kwiziq for getting into the nitty-gritty of grammar, or grabbing a highly-rated physical workbook so you can study offline."

  if (/paint|watercolou|acrylic|oil\s?paint|sketch|draw|art|illustration/.test(g))
    return "Consider grabbing a beginner's acrylic paint set and a multi-pack of canvases on Amazon to have ready on your desk."

  if (/read|book|novel|fiction|literature|biography/.test(g))
    return "A dedicated e-reader (like a Kindle) or a really nice reading lamp can make all the difference in building a cosy reading nook."

  if (/fitness|gym|weight|lift|strength|workout|exercise|bodybuilding/.test(g))
    return "A solid pair of resistance bands or a thick, durable yoga mat is perfect for getting started right in your living room."

  if (/run|jog|marathon|sprint|5k|10k|half marathon/.test(g))
    return "A dedicated GPS running watch is amazing so you can track your routes while leaving your phone safely at home."

  if (/cook|bak|food|recipe|chef|cuisine|kitchen|pastry/.test(g))
    return "Treat yourself to a classic, beautiful cookbook (like Salt, Fat, Acid, Heat) to flip through instead of looking at recipes on a screen."

  if (/writ|journal|diary|blog|story|prose|poetry/.test(g))
    return "Nothing beats the tactile feel of a premium dotted notebook and a smooth-writing fountain pen to get the ideas flowing."

  if (/garden|plant|grow|flower|herb|vegetable|allotment/.test(g))
    return "A beginner's indoor herb garden kit or some ergonomic hand trowels can get your hands in the dirt quickly."

  if (/photo|camera|photography|shoot|street photo/.test(g))
    return "Look into a disposable film camera or a beginner DSLR. It trains your eye to look at the world without immediate digital gratification."

  if (/guitar|piano|violin|drum|bass|instrument|music|sing|ukulele|chord|banjo/.test(g))
    return "If you're learning guitar or piano, a physical metronome is a fantastic, screen-free tool for practising timing."

  if (/meditat|mindful|breath|yoga|zen|tai chi/.test(g))
    return "A proper, comfortable meditation cushion (a zafu) creates a physical space in your room dedicated purely to mindfulness."

  if (/knit|crochet|sew|stitch|yarn|embroider|needle/.test(g))
    return "A beginner's yarn bundle and some ergonomic hooks will keep your hands busy and off your touchscreen!"

  if (/hik|trail|trek|walk|nature|climb|scramble/.test(g))
    return "A reliable physical compass and a detailed map of your local trails are great for exploring without relying on a GPS app."

  if (/puzzle|board game|chess|jigsaw|strategy game|card game/.test(g))
    return "A 1000-piece landscape puzzle or a classic strategy game is the perfect way to spend a screen-free evening."

  if (/wood|carv|whittle|diy|craft|build|make|construct|woodwork/.test(g))
    return "A beginner-friendly whittling kit or a quality tape measure (marked out clearly in cms!) is a great starting point for making things with your hands."

  return 'We recommend grabbing whatever beginner physical tools you need for this hobby so they are sitting visible in your room.'
}

/* ─────────────────────────────────────────────────────────────────────────────
   DAY 0 — PRE-RECOVERY EMAIL
   Sent immediately when the user clicks "Start My Journey".
   Not part of the cron schedule.
───────────────────────────────────────────────────────────────────────────── */
export const DAY_0: { subject: string; body: (goal: string | null) => string } = {
  subject: 'Welcome to Mind Sovereignty — Your Pre-Recovery Guide',
  body: (goal) => {
    const toolRec    = getHobbyToolRecommendation(goal)
    const goalPhrase = goal ?? 'the activities that matter to you'

    return `Congratulations on completing your assessment. You've taken the first and hardest step: admitting that something needs to change and deciding to do something about it.

This email is your starting gun. Your 28-day recovery plan begins now, and over the next four weeks you'll receive a check-in from us every few days to keep you on track.

Your goal for the next 28 days is to reclaim your time and pour it into ${goalPhrase}. Keep that front of mind whenever the urge to scroll hits.

Your tool recommendation:
${toolRec}

Having the physical tools for your hobby sitting visibly in your room is one of the most effective environmental design changes you can make. When the phone urge strikes, your eye lands on them instead of your screen.

Before Day 1 begins:
• Silence all non-essential notifications on your phone
• Give your phone a dedicated "home" in a room you don't use for sleep or focused work
• Delete your highest-trigger apps — you can reinstall them after 28 days
• Tell one person you trust what you're doing
• Write down what you want back: time, focus, sleep, relationships — make it specific

You've already done the hardest part. Let's go.`
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAGGERED EMAIL SCHEDULE — Days 1 through 28
   body() receives goal (string | null) so each template can weave it in.
   Paragraph breaks: \n\n. Bullet points: lines starting with "• ".
───────────────────────────────────────────────────────────────────────────── */
export interface EmailTemplate {
  subject: string
  body:    (goal: string | null) => string
}

export const EMAIL_SCHEDULE: Record<number, EmailTemplate> = {

  /* ── Week 1: Battling the Instinct ──────────────────────────────────────── */
  1: {
    subject: 'Day 1: The journey begins! 🚀',
    body: (goal) =>
      `Welcome to Day 1! I want to be completely honest with you: the next four weeks are going to be challenging. Your brain is used to a very specific routine, and we are actively changing it. But making this commitment—and sticking to it—is one of the most powerful things you can do for yourself.

Think about the benefits waiting for you on the other side: deeper sleep, a calmer mind, better relationships, and actual, uninterrupted time to focus on ${goal ?? 'the things that matter to you'}. Stay strong today. You've got this.`,
  },

  4: {
    subject: 'Day 4: Why your focus feels fractured 🧠',
    body: () =>
      `You're a few days in! How is it going? If you're finding it hard to concentrate right now, it's not just in your head. Studies show that simply having a smartphone in the same room—even if it's turned off—reduces our cognitive capacity and fractures our focus.

The constant context-switching we do on our phones drains our mental energy. By stepping back, you are slowly giving your brain permission to heal and rebuild its attention span. Keep creating physical distance between you and your device when you need to focus!`,
  },

  7: {
    subject: 'Day 7: Brace yourself (The hardest week is here) 🌊',
    body: () =>
      `You've made it a full week! We want to prepare you: the week ahead is often the hardest. This is where phone withdrawals really start to kick in. You might feel restless, anxious, or like you're missing out.

This is happening because of dopamine irregularity. Your brain is used to constant, short-form hits of cheap dopamine. When you take those away, it creates an imbalance that actually causes physical and emotional discomfort. It's a dependence. If you can make it through this week, the noise will quiet down, and it will become so much easier. Hold the line!`,
  },

  /* ── Week 2: Tackling the Withdrawal ────────────────────────────────────── */
  10: {
    subject: "Day 10: Let's talk about the time you're getting back ⏳",
    body: () =>
      `We are midway through Week 2, and we just want to say: incredible job. We know this is the toughest stretch, and you are doing great.

Remember how you were spending hours a day on your phone? Think about how much of that time you are actively reclaiming right now. Across the world, collective screen time is skyrocketing. We are collectively losing our ability to just sit, be bored, and focus on one thing at a time. But not you. You are swimming against the current and taking your life back. Keep it up!`,
  },

  14: {
    subject: 'Day 14: You survived the hardest week! 🎉',
    body: (goal) =>
      `Congratulations! You've made it through the hardest week of the entire reset. I want to acknowledge something: you might not be feeling the "magical" benefits just yet. You might even be thinking, what's the point of this? That is completely normal.

Remind yourself why you started. You wanted to dedicate more time to ${goal ?? 'the things that matter'}. If you haven't started yet, this weekend is the perfect time to pull out those tools and dive in. And if you don't feel like it? Practice just sitting and being okay with being a little bored. Boredom is where creativity is born!`,
  },

  /* ── Week 3: Setting in Good Habits ─────────────────────────────────────── */
  18: {
    subject: 'Day 18: Looking up from the screen 👀',
    body: () =>
      `We are well into Week 3! Today, let's talk about connection. One of the quietest but most damaging effects of screen time is the erosion of our social skills. We're seeing this across the board, but especially in kids and young people—screens are replacing face-to-face interaction.

The nuances of eye contact, body language, and shared physical presence are being traded for text bubbles and likes. Make it a goal today to connect with someone entirely offline. Grab a coffee, go for a walk, or just have a conversation without a phone in your hand.`,
  },

  21: {
    subject: 'Day 21: The final stretch is here! 🏁',
    body: () =>
      `We are entering the final week of your 28-day plan! It has been a challenging road, but as you move through these next few days, pay close attention to how you feel. Are you noticing that your mood is a bit more stable? Is your focus lasting a little longer? Do you feel like you just have more time in the day? The fog is lifting. Let's finish this last week strong!`,
  },

  /* ── Week 4: Consolidating ───────────────────────────────────────────────── */
  25: {
    subject: 'Day 25: How are you feeling? ✍️',
    body: () =>
      `You are so close to the finish line! Take five minutes today to write down any feelings or improvements you've noticed since Day 1. Putting it on paper makes it real.

Remember, this plan isn't about throwing your phone in the ocean and never using tech again. It's about building a healthier, more mindful relationship that avoids the doomscrolling.

Tips to maintain your progress:
• Keep your phone in another room when you need to focus
• Use website and app blockers to maintain friction on those old trigger apps
• Protect your mornings and evenings!`,
  },

  28: {
    subject: "Day 28: You did it. What's next? 🏆",
    body: () =>
      `You made it to the end of the 28 days! Huge congratulations are in order. Take some time today to write down exactly how you feel right now. Store those notes somewhere safe.

We want to be realistic: you might relapse. You might have a day where you fall back down a scrolling rabbit hole. When that happens, be kind to yourself, read over those notes, and remind yourself of the benefits you earned to get right back on track.

Keep your habits strong:
• Keep your phone away during focus hours
• Use app blockers
• Protect your boundaries

Finally, we'd love to hear from you. How did your recovery plan go? What could we improve? Hit reply and let us know—your feedback helps us build a better tool for everyone.`,
  },
}

export { DASHBOARD_URL, FROM_ADDRESS as FROM }
