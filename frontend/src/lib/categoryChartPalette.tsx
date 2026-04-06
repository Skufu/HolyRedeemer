import type { FC } from 'react';

/**
 * Distinct categorical colors for category pie/donut charts (even hue spacing, dark enough for contrast on cream backgrounds).
 * Use with slice index so each segment maps uniquely for typical library category counts.
 */
export const CATEGORY_CATEGORICAL_PALETTE = [
  '#7C2D12',
  '#1D4ED8',
  '#047857',
  '#A16207',
  '#6D28D9',
  '#C2410C',
  '#0E7490',
  '#BE185D',
  '#4338CA',
  '#4D7C0F',
  '#B45309',
  '#0F766E',
] as const;

export function categoryFillAt(index: number): string {
  return CATEGORY_CATEGORICAL_PALETTE[index % CATEGORY_CATEGORICAL_PALETTE.length];
}

/** Recharts legend: colored swatch + readable foreground labels (avoids low-contrast yellow/orange text). */
export const CategoryPieLegend: FC<{ payload?: { value?: string; color?: string }[] }> = ({ payload }) => {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 list-none p-0 text-xs text-foreground">
      {payload.map((entry) => (
        <li key={String(entry.value)} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm border border-border/50"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};
