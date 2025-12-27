type Props = {
  data: { language: string; count: number }[];
};

const COLORS = [
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#E91E63",
  "#9C27B0",
  "#00BCD4",
  "#FF5722",
  "#8BC34A",
];

export default function LanguagePieChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  let cumulativePercent = 0;

  // helper: maakt SVG path voor een segment
  function getPathSegment(percent: number) {
    const radius = 16;
    const largeArc = percent > 0.5 ? 1 : 0;

    const startX = radius * Math.cos(Math.PI * 2 * cumulativePercent);
    const startY = radius * Math.sin(Math.PI * 2 * cumulativePercent);

    cumulativePercent += percent;

    const endX = radius * Math.cos(Math.PI * 2 * cumulativePercent);
    const endY = radius * Math.sin(Math.PI * 2 * cumulativePercent);

    return `
      M ${startX} ${startY}
      A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}
      L 0 0
    `;
  }

  return (
    <div className="pie-chart-wrapper">
      <svg
        width="180"
        height="180"
        viewBox="-18 -18 36 36"
        className="pie-chart"
      >
        {data.map((d, i) => {
          const percent = d.count / total;
          const path = getPathSegment(percent);

          return (
            <path
              key={d.language}
              d={path}
              fill={COLORS[i % COLORS.length]}
            />
          );
        })}
      </svg>

      <div className="pie-legend">
        {data.map((d, i) => {
          const percent = ((d.count / total) * 100).toFixed(0);

          return (
            <div key={d.language} className="pie-legend-item">
              <span
                className="pie-legend-color"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="pie-legend-label">
                {d.language} - {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
