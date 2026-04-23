export default function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return (
    <div className={`${s} border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin`} />
  );
}
