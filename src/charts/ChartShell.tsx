import { type ReactNode, useId, useState } from 'react';

export interface ChartTableData {
  caption: string;
  head: string[];
  rows: string[][];
}

interface ChartShellProps {
  title: string;
  /** Always-visible sentence(s) that carry the chart's message in words. */
  summary: ReactNode;
  table: ChartTableData;
  children: ReactNode;
  /** Controls above the plot, e.g. exercise chips. */
  controls?: ReactNode;
}

/**
 * Frame shared by the three charts: title, written summary, the plot, and a
 * "Visa som tabell" toggle that swaps in the same numbers as a plain table.
 */
export function ChartShell({
  title,
  summary,
  table,
  children,
  controls,
}: ChartShellProps) {
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="m-0 text-3xl font-bold">{title}</h2>
      <p className="m-0 text-base">{summary}</p>
      {controls}
      {asTable ? (
        <div id={tableId} className="overflow-x-auto">
          <table className="w-full border-collapse text-base">
            <caption className="pb-2 text-left text-ink-soft">
              {table.caption}
            </caption>
            <thead>
              <tr>
                {table.head.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`border-b-2 border-ink py-2 font-bold ${
                      i === 0 ? 'text-left' : 'text-right'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, i) => {
                    const cls = `border-b border-edge py-2 ${
                      i === 0 ? 'text-left' : 'count text-right text-xl'
                    }`;
                    return i === 0 ? (
                      <th
                        key={cell}
                        scope="row"
                        className={`${cls} font-normal`}
                      >
                        {cell}
                      </th>
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
                      <td key={i} className={cls}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
      <button
        type="button"
        aria-expanded={asTable}
        aria-controls={asTable ? tableId : undefined}
        onClick={() => setAsTable((v) => !v)}
        className="min-h-12 self-start rounded-md border-2 border-edge bg-surface px-4 text-base font-bold text-ink"
      >
        {asTable ? 'Visa som diagram' : 'Visa som tabell'}
      </button>
    </section>
  );
}
