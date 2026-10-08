import HeatMap from '@uiw/react-heat-map';

type Activity = Record<string, number>;

function readActivity(value: unknown): Activity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Activity = {};
  for (const [date, rawCount] of Object.entries(value as Record<string, unknown>)) {
    const count = Number(rawCount);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(count) && count > 0) {
      result[date] = count;
    }
  }
  return result;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type NoteHeatmapProps = {
  activity: unknown;
  dark?: boolean;
};

export function NoteHeatmap({ activity, dark = false }: NoteHeatmapProps) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 83);
  startDate.setHours(0, 0, 0, 0);

  const startKey = dateKey(startDate);
  const endKey = dateKey(endDate);
  const entries = Object.entries(readActivity(activity))
    .filter(([date]) => date >= startKey && date <= endKey)
    .sort(([a], [b]) => a.localeCompare(b));
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total < 1) return null;

  const value = entries.map(([date, count]) => ({ date: date.replace(/-/g, '/'), count }));

  return (
    <div className="note-heatmap" onClick={event => event.stopPropagation()}>
      <div className="note-heatmap-heading">
        <span>Calor</span>
        <span>{total} {total === 1 ? 'conclusão' : 'conclusões'}</span>
      </div>
      <HeatMap
        value={value}
        width={240}
        startDate={startDate}
        endDate={endDate}
        rectSize={5}
        space={2}
        weekLabels={false}
        monthLabels={false}
        legendCellSize={0}
        rectProps={{ rx: 2 }}
        panelColors={{
          0: dark ? '#36363b' : '#f1f1f5',
          1: '#fed7aa',
          2: '#fb923c',
          3: '#ef4444',
          4: '#b91c1c',
          5: '#7f1d1d',
        }}
      />
    </div>
  );
}
