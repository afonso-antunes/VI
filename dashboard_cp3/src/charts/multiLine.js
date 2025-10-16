import { renderLegend } from '../core/legend.js';

export function mountMultiLine(rootEl, metricToggleEl, state, bus) {
  const BAD_DECADES = new Set(['Multi-decade', 'Unknown']);
  const decadeSort = (a, b) => {
    const na = +(String(a).match(/\d+/)?.[0] ?? Infinity);
    const nb = +(String(b).match(/\d+/)?.[0] ?? Infinity);
    return na - nb;
  };

  const margin = { top: 24, right: 56, bottom: 48, left: 64 };
  const width  = rootEl.clientWidth;
  const height = rootEl.clientHeight || 360;

  const svg = d3.select(rootEl).append('svg')
    .attr('width', width)
    .attr('height', height);

  const tip = d3.select(rootEl)
    .style('position', 'relative')
    .append('div')
    .attr('class', 'tooltip');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x  = d3.scalePoint().range([0, innerW]).padding(0.5);
  const yL = d3.scaleLinear().range([innerH, 0]);
  const yR = d3.scaleLinear().range([innerH, 0]);

  const xAxisG  = g.append('g').attr('class', 'axis x')
    .attr('transform', `translate(0,${innerH})`);
  const yLAxisG = g.append('g').attr('class', 'axis y left');
  const yRAxisG = g.append('g').attr('class', 'axis y right')
    .attr('transform', `translate(${innerW},0)`);

  // labels
  g.append('text')
    .attr('class','x-label')
    .attr('x', innerW / 2)
    .attr('y', innerH + 36)
    .attr('text-anchor', 'middle')
    .attr('fill', '#c7d0dc')
    .text('Decade');

  g.append('text')
    .attr('class','y-label left')
    .attr('transform','rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -48)
    .attr('text-anchor','middle')
    .attr('fill','#c7d0dc')
    .text('Global Sales (M)');

  const rightLabel = g.append('text')
    .attr('class','y-label right')
    .attr('transform','rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', innerW + 44)
    .attr('text-anchor','middle')
    .attr('fill','#c7d0dc');

  // layers
  const pathsG = g.append('g').attr('class','multi-paths');

  const palette = [
    '#60a5fa','#22d3ee','#a78bfa','#f472b6','#f59e0b','#ef4444',
    '#10b981','#d946ef','#93c5fd','#06b6d4','#f97316','#84cc16'
  ];

  const fmtSales = d3.format('.2f');
  const fmtScore = d3.format('.1f');

  let selectedKey = null;
  let metric = 'critic';
  const metricLabelEl = document.getElementById('lineMetricLabel');

  function setMetricFromToggle() {
    metric = metricToggleEl && metricToggleEl.checked ? 'user' : 'critic';
    if (metricLabelEl)
      metricLabelEl.textContent = metric === 'critic' ? 'Avg Critic Score' : 'Avg User Score';
  }
  if (metricToggleEl) {
    metricToggleEl.addEventListener('change', () => { setMetricFromToggle(); update(); });
    setMetricFromToggle();
  }

  function makeColor(categories) {
    const map = new Map();
    categories.forEach((c, i) => map.set(c, palette[i % palette.length]));
    return c => map.get(c) || '#999';
  }

  function applySelectionStyles() {
    d3.select(rootEl)
      .selectAll('.multi-paths .line, .multi-paths .hit')
      .attr('display', d => (selectedKey && d.key !== selectedKey) ? 'none' : null);
  }

  function toggleSelect(key) {
    selectedKey = (selectedKey === key) ? null : key;
    applySelectionStyles();
    const payload = selectedKey || null;
    bus.emit('STACKED/SELECT/genre', payload);

    bus.emit('LINE/SELECT/genre', { genre: selectedKey });

    bus.emit('STATE/CHANGE');
  }

  function buildSeries(rows) {
    const rowsClean = rows.filter(d => !BAD_DECADES.has(d.Decade));
    const decades = Array.from(new Set(rowsClean.map(d => d.Decade))).sort(decadeSort);

    const byGenreSales = d3.rollup(rowsClean, v => d3.sum(v, d => d.Global_Sales || 0), d => d.Genre || 'Unknown');
    const genresSorted = Array.from(byGenreSales.entries()).sort((a,b)=>b[1]-a[1]).map(d=>d[0]);
    const topGenres = genresSorted.slice(0, 10);
    const color = makeColor(topGenres);

    const roll = d3.rollup(
      rowsClean.filter(r => topGenres.includes(r.Genre)),
      v => ({
        sales: d3.sum(v, d => d.Global_Sales || 0),
        critic: d3.mean(v, d => Number.isFinite(d.Critic_Score) ? d.Critic_Score : undefined),
        user: d3.mean(v, d => Number.isFinite(d.User_Score) ? d.User_Score : undefined),
      }),
      d => d.Genre, d => d.Decade
    );

    const series = topGenres.map(genre => {
      const m = roll.get(genre) || new Map();
      const values = decades.map(dec => {
        const rec = m.get(dec) || { sales: 0, critic: undefined, user: undefined };
        return { decade: dec, sales: rec.sales, critic: rec.critic, user: rec.user };
      });
      return { key: genre, color: color(genre), values };
    });

    return { series, decades, color };
  }

  const lineSales = d3.line()
    .curve(d3.curveMonotoneX)
    .defined(d => Number.isFinite(d.sales))
    .x(d => x(d.decade))
    .y(d => yL(d.sales));

  const lineScore = d3.line()
    .curve(d3.curveMonotoneX)
    .defined(d => Number.isFinite(d[metric]))
    .x(d => x(d.decade))
    .y(d => yR(d[metric]));

  function updateAxes() {
    xAxisG.call(d3.axisBottom(x).tickSizeOuter(0));
    yLAxisG.call(d3.axisLeft(yL).ticks(5));
    yRAxisG.call(d3.axisRight(yR).ticks(5));
    rightLabel.text(metric === 'critic' ? 'Avg Critic Score' : 'Avg User Score');
  }

  function draw(series) {
    const seriesG = pathsG.selectAll('g.series').data(series, d => d.key);
    const enter = seriesG.enter().append('g').attr('class','series');

    enter.append('path')
      .attr('class','line')
      .attr('fill','none')
      .attr('stroke', d => d.color)
      .attr('stroke-width',2)
      .attr('d', d => lineSales(d.values));

    enter.append('path')
      .attr('class','score-line')
      .attr('fill','none')
      .attr('stroke', d => d.color)
      .attr('stroke-width',1.5)
      .attr('stroke-dasharray','5,4')
      .attr('opacity',0.85)
      .attr('d', d => lineScore(d.values));

    enter.append('path')
      .attr('class','hit')
      .attr('fill','none')
      .attr('stroke','transparent')
      .attr('stroke-width',40)
      .style('pointer-events','stroke')
      .attr('d', d => lineSales(d.values))
      .on('click', function (evt, d) {
        toggleSelect(d.key);
        this.parentNode.parentNode.appendChild(this.parentNode);
      })
      .on('mousemove', (evt, d) => {
        const [gx] = d3.pointer(evt, g.node());
        const decs = d.values.map(v => v.decade);
        const idx = d3.bisectCenter(decs.map(x), gx); 
        const closest = d.values[idx] || d.values[d.values.length-1];
        const html = `
          <div><b>${d.key}</b></div>
          <div><b>Decade:</b> ${closest.decade}</div>
          <div><b>Global Sales:</b> ${fmtSales(closest.sales)} M</div>
          <div><b>${metric === 'critic' ? 'Avg Critic' : 'Avg User'} Score:</b> ${Number.isFinite(closest[metric]) ? fmtScore(closest[metric]) : '—'}</div>
        `;
        const [mx,my] = d3.pointer(evt, rootEl);
        tip.html(html)
          .style('left', (mx + 12) + 'px')
          .style('top',  (my + 12) + 'px')
          .style('display', 'block');
      })
      .on('mouseleave', () => tip.style('display','none'));

    seriesG.merge(enter).select('.line')
      .transition().duration(250)
      .attr('d', d => lineSales(d.values))
      .attr('stroke', d => d.color);

    seriesG.merge(enter).select('.score-line')
      .transition().duration(250)
      .attr('d', d => lineScore(d.values))
      .attr('stroke', d => d.color);

    seriesG.merge(enter).select('.hit')
      .attr('d', d => lineSales(d.values));

    seriesG.exit().remove();
    applySelectionStyles();
  }

  function update() {
    const rows = state.data.view.filter(d =>
      d.Decade && !BAD_DECADES.has(d.Decade) && Number.isFinite(d.Global_Sales)
    );

    const { series, decades, color } = buildSeries(rows);
    x.domain(decades);

    const maxSales = d3.max(series, s => d3.max(s.values, v => v.sales)) || 1;
    yL.domain([0, maxSales]).nice();

    const allCrit = series.flatMap(s => s.values.map(v => v.critic)).filter(Number.isFinite);
    const allUser = series.flatMap(s => s.values.map(v => v.user)).filter(Number.isFinite);
    const rCrit = allCrit.length ? [Math.min(50, d3.min(allCrit)), Math.max(90, d3.max(allCrit))] : [0,100];
    const rUser = allUser.length ? [Math.min(4, d3.min(allUser)), Math.max(9, d3.max(allUser))] : [0,10];
    yR.domain(metric === 'critic' ? rCrit : rUser).nice();

    updateAxes();
    draw(series);

    const legendHost = d3.select(rootEl.parentNode).select('.legend-root').node();
    if (legendHost) {
      const cats = series.map(s => s.key);
      renderLegend(legendHost, cats, (g)=>color(g), (label) => toggleSelect(label));
    }
  }

  d3.select(document).on('click.multiClear', (evt) => {
    if (!rootEl.contains(evt.target)) {
      if (selectedKey !== null) {
        selectedKey = null;
        applySelectionStyles();
        bus.emit('LINE/SELECT/genre', { genre: null });
        bus.emit('STACKED/SELECT/genre', { genre: null });
      }
    }
  });

  bus.on('STATE/CHANGE', update);
  update();
}
