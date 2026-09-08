import { Bar, BarChart, Cell, ResponsiveContainer } from 'recharts';

export default function MeasuredHistogramChart({ data, highlightRegion }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap="18%">
        <Bar dataKey="value" isAnimationActive={false} radius={0}>
          {data.map((entry, index) => {
            const isLeft = index < data.length / 3;
            const isRight = index >= (data.length * 2) / 3;
            
            let isActive = false;
            if (highlightRegion === 'shadows' && isLeft) isActive = true;
            if (highlightRegion === 'highlights' && isRight) isActive = true;
            if (highlightRegion === 'midtones' && !isLeft && !isRight) isActive = true;
            if (highlightRegion === 'all' || !highlightRegion) isActive = true;
            
            const isClipped = (index === 0 || index === data.length - 1) && entry.value > 0;
            const baseColor = isClipped ? '#b8924a' : '#2a211b';
            const mutedColor = 'rgba(42, 33, 27, 0.2)';
            
            return <Cell key={`cell-${index}`} fill={isActive ? baseColor : mutedColor} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
