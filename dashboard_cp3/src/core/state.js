import { applyFilters, initialFilters, filtersHash } from './state_filters.js';
import { aggregateForStacked } from './state_agg.js';

export function createState(pre, bus) {
  const st = {
    mode: 'region',      
    normalize: false,
    filters: initialFilters(pre),
    data: { raw: pre.raw, view: pre.raw },
    lookups: pre.lookups,
    selection: { genre: null, segment: null },
    cache: new Map()
  };

  function recalcView() { st.data.view = applyFilters(pre.raw, st.filters); }
  function notify() { bus.emit('STATE/CHANGE', st); }

  bus.on('FILTERS/APPLY', () => { recalcView(); notify(); });
  bus.on('FILTERS/CLEAR', () => {
    st.filters = initialFilters(pre);
    recalcView();
    st.selection = { genre: null, segment: null };
    notify();
  });
  bus.on('MODE/CHANGE', (mode) => { st.mode = mode; notify(); });
  bus.on('NORMALIZE/TOGGLE', (v) => { st.normalize = v; notify(); });
  bus.on('STACKED/SELECT/genre', (g) => {
    st.selection.genre = g === st.selection.genre ? null : g; notify();
  });
  bus.on('STACKED/SELECT/segment', (seg) => {
    st.selection.segment = seg && (st.selection.segment && st.selection.segment.key === seg.key) ? null : seg; notify();
  });

  st.getStacked = () => {
    const key = JSON.stringify({ mode: st.mode, norm: st.normalize, fh: filtersHash(st.filters) });
    if (st.cache.has(key)) return st.cache.get(key);
    const agg = aggregateForStacked(st.data.view, st.mode, st.normalize);
    st.cache.set(key, agg);
    return agg;
  };

  recalcView();
  return st;
}
