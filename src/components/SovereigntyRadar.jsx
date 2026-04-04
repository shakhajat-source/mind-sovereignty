import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

/* ── Custom tooltip ────────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { subject, value } = payload[0].payload
  return (
    <div className="bg-[#1A1A1A] text-white text-xs font-sans font-light px-3 py-2 shadow-lg">
      <span className="font-semibold">{subject}</span>
      <span className="ml-2 font-mono">{value}</span>
    </div>
  )
}

/* ── Custom axis tick ──────────────────────────────────────────────────────── */
function AxisTick({ x, y, payload }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{
        fontSize: '11px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: 'rgba(44,44,44,0.50)',
        fontWeight: 400,
      }}
    >
      {payload.value}
    </text>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */
// Accepts either:
//   data  = [{ subject: string, value: number }, ...]  (generic)
//   scores = { focus_endurance, digital_autonomy, ... } (legacy)
export default function SovereigntyRadar({ data, scores }) {
  const PILLAR_SHORT = {
    focus_endurance:    'Focus',
    digital_autonomy:   'Autonomy',
    boundary_integrity: 'Boundaries',
    emotional_stability:'Emotional',
    utility_efficiency: 'Utility',
  }

  const chartData = data ?? (scores
    ? Object.entries(scores).map(([k, v]) => ({
        subject: PILLAR_SHORT[k] ?? k,
        value:   v,
      }))
    : [])

  if (!chartData.length) return null

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="72%"
          data={chartData}
          startAngle={90}
          endAngle={90 - 360}
        >
          <PolarGrid
            gridType="polygon"
            stroke="rgba(44,44,44,0.08)"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={<AxisTick />}
            axisLine={false}
            tickLine={false}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="#5c8260"
            fill="#5c8260"
            fillOpacity={0.18}
            strokeWidth={1.5}
            dot={{ r: 3, fill: '#5c8260', strokeWidth: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score pills below chart */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {chartData.map(({ subject, value }) => (
          <div key={subject} className="space-y-0.5">
            <div className="text-base font-display font-bold text-charcoal">
              {value}
            </div>
            <div className="text-[10px] text-charcoal/35 font-sans font-light leading-tight">
              {subject}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
