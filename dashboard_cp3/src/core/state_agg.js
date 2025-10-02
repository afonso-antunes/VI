import { makePublisherColor, makeRegionColor } from './theme.js';

export function aggregateForStacked(rows, mode, normalize) {
  const perGenre = new Map(); 
  const totals = new Map();   

  const add = (genre, seg, val) => {
    if (!perGenre.has(genre)) perGenre.set(genre, new Map());
    const m = perGenre.get(genre);
    m.set(seg, (m.get(seg) || 0) + val);
    totals.set(genre, (totals.get(genre) || 0) + val);
  };

  for (const d of rows) {
    const genre = d.Genre || 'Unknown';
    if (mode === 'publisher') {
      add(genre, d.Publisher || 'Unknown', d.Global_Sales || 0);
    } else {
      add(genre, 'North America', d.NA_Sales || 0);
      add(genre, 'Europe', d.EU_Sales || 0);
      add(genre, 'Japan', d.JP_Sales || 0);
      add(genre, 'Other', d.Other_Sales || 0);
    }
  }

  const N = mode === 'publisher' ? 8 : 4;
  const seriesSet = new Set();
  const data = [];

  const genres = [...perGenre.keys()].sort((a, b) => (totals.get(b) - totals.get(a)));

  for (const g of genres) {
    const m = perGenre.get(g);
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    let other = 0;
    const kept = [];
    entries.forEach(([k, v], i) => {
      if (i < N && v > 0) { kept.push([k, v]); seriesSet.add(k); }
      else other += v;
    });
    if (other > 0) { kept.push(['Other', other]); seriesSet.add('Other'); }
    const total = kept.reduce((s, x) => s + x[1], 0);
    const row = { Genre: g };
    kept.forEach(([k, v]) => {
      const val = normalize && total > 0 ? (v / total) : v;
      row[k] = val;
    });
    row.__total = normalize ? 1 : total;
    row.__totalAbs = total; 
    data.push(row);
  }

  const series = [...seriesSet];
  const color = mode === 'publisher' ? makePublisherColor(series) : makeRegionColor(series);
  return { data, series, color, genres };
}
