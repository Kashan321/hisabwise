'use client';

const MONTHLY_SALES = [
  { month: 'Jan', value: 1200 },
  { month: 'Feb', value: 1800 },
  { month: 'Mar', value: 2800 },
  { month: 'Apr', value: 1600 },
  { month: 'May', value: 2900 },
  { month: 'Jun', value: 2500 },
  { month: 'Jul', value: 1500 },
  { month: 'Aug', value: 1900 },
  { month: 'Sep', value: 3000 },
  { month: 'Oct', value: 2000 },
] as const;

const Y_TICKS = [2500, 1500, 0];

export function SalesStatisticsChart() {
  const maxValue = Math.max(...MONTHLY_SALES.map((d) => d.value));

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Y-axis */}
        <div className="flex flex-col justify-between h-[120px] py-0.5 shrink-0 w-8">
          {Y_TICKS.map((tick) => (
            <span key={tick} className="text-[9px] text-gray-400 leading-none text-right">
              {tick === 0 ? '0' : tick.toLocaleString()}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 min-w-0">
          <div className="relative h-[120px] border-l border-b border-gray-100">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {Y_TICKS.slice(0, -1).map((tick) => (
                <div key={tick} className="border-t border-dashed border-gray-100 w-full" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5 px-0.5 pb-0">
              {MONTHLY_SALES.map((item) => {
                const heightPct = Math.round((item.value / maxValue) * 100);
                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                  >
                    <div
                      className="w-full rounded-t-sm bg-sky-200 hover:bg-sky-300 transition-colors"
                      style={{ height: `${heightPct}%`, minHeight: '4px' }}
                      title={`${item.month}: ${item.value.toLocaleString()}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1 sm:gap-1.5 mt-2 pl-0.5">
            {MONTHLY_SALES.map((item) => (
              <span
                key={`label-${item.month}`}
                className="flex-1 text-center text-[8px] sm:text-[9px] text-gray-400 truncate"
              >
                {item.month}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-right">
        Total Oct sales:{' '}
        <span className="font-semibold text-gray-600">
          PKR {MONTHLY_SALES[9].value.toLocaleString()}
        </span>
      </p>
    </div>
  );
}
