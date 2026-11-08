import { CheckCircle2, XCircle } from 'lucide-react';
import type { Decision } from '../types';

export default function DecisionBadge({
  decision,
}: {
  decision: Decision;
}) {
  if (!decision) return null;

  const isAvailable = decision === 'available';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
        isAvailable
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
      }`}
    >
      {isAvailable ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {isAvailable ? 'Available' : 'Unavailable'}
    </span>
  );
}
