import { motion } from 'framer-motion';
import { ExternalLink, CheckCircle, AlertTriangle, Info, Tag, BarChart2, Search, XCircle, FlaskConical } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ScoreRing from './ui/ScoreRing';

const LANG_LABELS = { en: 'English', mr: 'Marathi', hi: 'Hindi' };
const TYPE_LABELS = { general: 'General Knowledge', health: 'Health / Medical', math: 'Mathematics' };

function getVerdict(accuracy) {
  if (accuracy >= 80) return { label: 'Likely Accurate',    color: 'text-green-400',  icon: CheckCircle,  bg: 'bg-green-500/10 border-green-500/20' };
  if (accuracy >= 50) return { label: 'Partially Accurate', color: 'text-yellow-400', icon: Info,         bg: 'bg-yellow-500/10 border-yellow-500/20' };
  return               { label: 'Likely Hallucination',     color: 'text-red-400',    icon: AlertTriangle, bg: 'bg-red-500/10 border-red-500/20' };
}

const ChartTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-slate-100">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export default function ResultCard({ result }) {
  const verdict = getVerdict(result.accuracyScore ?? result.accuracy ?? 50);
  const VerdictIcon = verdict.icon;
  const bd = result.breakdown;
  const accuracy    = result.accuracyScore    ?? result.accuracy    ?? 50;
  const hallucination = result.hallucinationScore ?? result.hallucination ?? 50;
  const confidence  = result.confidenceScore  ?? result.confidence  ?? 30;

  const pieData = [
    { name: 'Accuracy',      value: accuracy,    fill: '#22c55e' },
    { name: 'Hallucination', value: hallucination, fill: '#ef4444' },
  ];

  const sources = result.sources?.length > 0
    ? result.sources
    : result.sourceUrl ? [result.sourceUrl] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }} className="space-y-4">

      {/* Verdict Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${verdict.bg}`}>
        <VerdictIcon className={`w-5 h-5 ${verdict.color} flex-shrink-0`} />
        <div className="flex-1">
          <p className={`font-semibold ${verdict.color}`}>{verdict.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {LANG_LABELS[result.detectedLanguage] || result.detectedLanguage || 'English'} ·{' '}
            {TYPE_LABELS[result.inputType] || result.inputType || 'General'}
          </p>
        </div>
        {result.normalized?.hasMath && (
          <span className="px-2 py-1 bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs rounded-full flex items-center gap-1">
            <FlaskConical className="w-3 h-3" /> Contains Math
          </span>
        )}
      </div>

      {/* Score Rings + Pie */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Analysis Scores</h3>
        <div className="flex flex-wrap items-center justify-around gap-6">
          <ScoreRing value={accuracy}     label="Accuracy"     color="green" />
          <ScoreRing value={hallucination} label="Hallucination" color="red"   />
          <ScoreRing value={confidence}   label="Confidence"   color="blue"  />
          <div className="w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={66}
                  paddingAngle={3} dataKey="value" animationBegin={200} animationDuration={800}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {bd && (
          <div className="mt-4 pt-4 border-t border-surface-700 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">Semantic</p>
              <p className="text-sm font-semibold text-brand-300">{Math.round((bd.semantic_score || 0) * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Keyword Match</p>
              <p className="text-sm font-semibold text-brand-300">{Math.round((bd.keyword_match || 0) * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Chunks Checked</p>
              <p className="text-sm font-semibold text-brand-300">{bd.chunks_compared || 1}</p>
            </div>
          </div>
        )}
      </div>

      {/* Verified Information */}
      {result.correctAnswer && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" /> Verified Information
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">{result.correctAnswer}</p>
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {i === 0 ? (result.sourceName || 'Wikipedia') : `Source ${i + 1}`}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hallucinated terms */}
      {result.differences?.length > 0 && (
        <div className="card border-red-500/20 bg-red-500/5">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Potentially Hallucinated Terms
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.differences.map((d, i) => (
              <span key={i} className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-full">{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Keywords */}
      {result.extractedKeywords?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" /> Extracted Search Terms
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.extractedKeywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 bg-surface-700 text-slate-400 text-xs rounded-full">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Matched Keywords */}
      {result.keyMatches?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-400" /> Matched in Source
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.keyMatches.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs rounded-full">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
