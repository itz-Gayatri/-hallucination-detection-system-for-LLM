export default function ScoreRing({ value, label, color }) {
  const colors = { green: '#22c55e', red: '#ef4444', blue: '#6366f1' };
  const textColors = { green: 'text-green-400', red: 'text-red-400', blue: 'text-brand-400' };
  const r = 36, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="48" cy="48" r={r} fill="none" stroke={colors[color]} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${textColors[color]}`}>{value}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
