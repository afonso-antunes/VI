export function makePublisherColor(series) {
  const palette = [
    '#60a5fa','#22d3ee','#a78bfa', '#f472b6','#f59e0b','#ef4444','#d946ef',
    '#93c5fd','#06b6d4','#c4b5fd','#fda4af','#fbbf24','#f97316','#84cc16'
  ];
  const map = new Map();
  let i = 0;
  for (const s of series) {
    if (!map.has(s)) map.set(s, palette[i++ % palette.length]);
  }
  return s => map.get(s) || '#999';
}

export function makeRegionColor() {
  const map = new Map([
    ['North America', '#e11d48'], 
    ['Europe', '#2563eb'], 
    ['Japan', '#d946ef'], 
    ['Other', '#10b981']  
  ]);
  return s => map.get(s) || '#999';
}
