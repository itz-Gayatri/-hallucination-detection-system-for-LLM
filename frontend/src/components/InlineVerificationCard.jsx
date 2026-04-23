import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, ExternalLink, Tag, XCircle, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function getVerdict(accuracy) {
  if (accuracy >= 80) return { label: 'Likely Accurate',      color: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  icon: CheckCircle };
  if (accuracy >= 50) return { label: 'Partially Accurate',   color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', icon: Info };
  return               { label: 'Likely Hallucination',       color: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10',    icon: AlertTriangle };
}

function ScoreBar({ value, label, color }) {
  const bar  = { green: 'bg-green-500', red: 'bg-red-500', blue: 'bg-brand-500' };
  const text = { green: 'text-green-300', red: 'text-red-300', blue: 'text-brand-300' };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${text[color]}`}>{value}%</span>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar[color]} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <span style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value}%</span>
    </div>
  );
};

export default function InlineVerificationCard({ verification }) {
  if (!verification) return null;

  const acc  = verification.accuracy      ?? verification.accuracyScore      ?? 0;
  const hall = verification.hallucination ?? verification.hallucinationScore ?? 0;
  const conf = verification.confidence    ?? verification.confidenceScore    ?? 0;
  const verdict = getVerdict(acc);
  const VIcon = verdict.icon;

  const pieData = [
    { name: 'Accuracy',      value: acc,  fill: '#22c55e' },
    { name: 'Hallucination', value: hall, fill: '#ef4444' },
  ];

  const sources = verification.sources?.length > 0
    ? verification.sources
    : verification.sourceUrl ? [verification.sourceUrl] : [];

  const correctAnswer = verification.correctAnswer || verification.correct_answer;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`mt-3 rounded-xl border ${verdict.border} ${verdict.bg} overflow-hidden`}>

      {/* Status header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
        <VIcon className={`w-4 h-4 ${verdict.color} flex-shrink-0`} />
        <span className={`text-sm font-semibold ${verdict.color}`}>{verdict.label}</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Score bars + mini pie */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2.5">
            <ScoreBar value={acc}  label="Accuracy Level"      color="green" />
            <ScoreBar value={hall} label="Hallucination Level" color="red"   />
            <ScoreBar value={conf} label="Confidence Level"    color="blue"  />
          </div>
          <div className="w-20 h-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36}
                  paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={600}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Correct Answer */}
        {correctAnswer && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Correct Answer
            </p>
            <p className="text-sm text-slate-200 leading-relaxed bg-surface-900/60 rounded-lg px-3 py-2.5">
              {correctAnswer}
            </p>
          </div>
        )}

        {/* Explanation */}
        {verification.explanation && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5">Explanation</p>
            <p className="text-sm text-slate-300 leading-relaxed">{verification.explanation}</p>
          </div>
        )}

        {/* Math results */}
        {verification.mathResults?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-brand-400" /> Math Verification
            </p>
            <div className="space-y-1.5">
              {verification.mathResults.map((mr, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                  mr.correct === true  ? 'bg-green-500/10 text-green-300' :
                  mr.correct === false ? 'bg-red-500/10 text-red-300' :
                  'bg-surface-800 text-slate-400'
                }`}>
                  {mr.correct === true  ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> :
                   mr.correct === false ? <XCircle     className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> :
                                          <Info        className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <span>{mr.explanation || mr.error || 'Unable to verify'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hallucinated terms */}
        {verification.differences?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Potentially Hallucinated Terms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {verification.differences.map((d, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-full">{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* Matched keywords */}
        {verification.keyMatches?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-400" /> Matched in Source
            </p>
            <div className="flex flex-wrap gap-1.5">
              {verification.keyMatches.map((kw, i) => (
                <span key={i} className="px-2 py-0.5 bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs rounded-full">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Source link */}
        {sources.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Source
            </p>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  {i === 0 ? (verification.sourceName || 'Wikipedia') : `Source ${i + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
