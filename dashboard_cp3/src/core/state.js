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
  st.selection.density = null;
  st.selection.prevRank = null;


  bus.on('DENSITY/SELECT/group', (payload) => {
    const { group, n } = payload || {}; // group: 'top' | 'rest' | null

    const ranks = pre.raw.map(d => +d.Rank).filter(Number.isFinite);
    const minRank = ranks.length ? Math.min(...ranks) : 1;
    const maxRank = ranks.length ? Math.max(...ranks) : 99999;

    const sameGroup = st.selection.density && st.selection.density.group === group;

    if (!group || sameGroup) {
      st.selection.density = null;
      if (st.selection.prevRank) {
        st.filters.rank = [...st.selection.prevRank];
      } else {
        st.filters.rank = [minRank, maxRank];
      }
      st.selection.prevRank = null;
    } else {
      if (!st.selection.density) st.selection.prevRank = [...st.filters.rank];
      st.selection.density = { group, n };

      if (group === 'top') {
        st.filters.rank = [minRank, n];
      } else if (group === 'rest') {
        st.filters.rank = [n + 1, maxRank];
      }
    }

    st.data.view = applyFilters(pre.raw, st.filters);
    bus.emit('STATE/CHANGE', st);
  });
  
  // novo estado para a métrica do eixo direito
  st.lineMetric = 'critic'; // 'critic' | 'user'

  // listener para mudar a métrica
  bus.on('LINE/METRIC/CHANGE', (m) => {
    st.lineMetric = (m === 'user') ? 'user' : 'critic';
    notify();
  });

  // agregador para o line chart
  st.getLineSeries = () => {
    // cache key por filtros + metric
    const key = JSON.stringify({ type:'line', metric: st.lineMetric, fh: filtersHash(st.filters) });
    if (st.cache.has(key)) return st.cache.get(key);

    const rows = st.data.view;
    // apenas décadas válidas (ignora "Multi-Decade" etc)
    const byDec = new Map(); // dec -> { salesSum, criticSum, criticN, userSum, userN }
    for (const d of rows) {
      const dec = d.Decade;
      if (!Number.isFinite(dec)) continue; // só décadas numéricas
      if (!byDec.has(dec)) byDec.set(dec, { sales:0, critSum:0, critN:0, userSum:0, userN:0 });
      const acc = byDec.get(dec);
      acc.sales += (d.Global_Sales || 0);
      if (Number.isFinite(d.Critic_Score)) { acc.critSum += d.Critic_Score; acc.critN += 1; }
      if (Number.isFinite(d.User_Score))   { acc.userSum  += d.User_Score;   acc.userN  += 1; }
    }

    const decades = [...byDec.keys()].sort((a,b)=>a-b);
    const salesSeries = decades.map(k => ({ k, v: byDec.get(k).sales }));
    const scoreSeries = decades.map(k => {
      const acc = byDec.get(k);
      const v = st.lineMetric === 'critic'
        ? (acc.critN ? acc.critSum/acc.critN : NaN)
        : (acc.userN ? acc.userSum/acc.userN : NaN);
      return { k, v };
    });

    const res = { decades, salesSeries, scoreSeries };
    st.cache.set(key, res);
    return res;
  };

  bus.on('FILTERS/APPLY', () => { recalcView(); notify(); });
  bus.on('FILTERS/CLEAR', () => {
    st.filters = initialFilters(pre);
    recalcView();
    st.data.view = applyFilters(pre.raw, st.filters);
    st.selection = { genre: null, segment: null, density: null, prevRank: null };
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

  st.getDensity = (rankThreshold = 1500) => {
    const key = JSON.stringify({
      type: 'density',
      n: rankThreshold,
      fh: filtersHash(st.filters)  
    });

    if (st.cache.has(key)) return st.cache.get(key);

    const rows = st.data.view;

    const salesTop = rows
      .filter(d => Number.isFinite(d.Global_Sales) && d.Rank <= rankThreshold)
      .map(d => d.Global_Sales);

    const salesRest = rows
      .filter(d => Number.isFinite(d.Global_Sales) && d.Rank > rankThreshold)
      .map(d => d.Global_Sales);

    const res = { salesTop, salesRest };
    st.cache.set(key, res);
    return res;
  };


  recalcView();
  return st;
}
