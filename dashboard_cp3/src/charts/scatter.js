import { renderLegend } from '../core/legend.js';

export function mountScatter(rootEl, legendEl, state, bus) {
  const margin = { top: 24, right: 16, bottom: 56, left: 64 };
  const width  = rootEl.clientWidth;
  const height = rootEl.clientHeight || 360;

  let defaultX = [0, 1];
  let defaultY = [0, 1];
  let xDomain = defaultX.slice();
  let yDomain = defaultY.slice();
  let initializedDomains = false;

  let selectedGenre = null;
  let densityFilter = null; 

  const svg = d3.select(rootEl).append('svg')
    .attr('width', width)
    .attr('height', height);

  const tip = d3.select(rootEl)
    .style('position','relative')
    .append('div')
    .attr('class','tooltip');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;
  const clipId = `clip-scatter-${Math.random().toString(36).slice(2)}`;
    svg.append('defs').append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', margin.left).attr('y', margin.top)
    .attr('width', innerW).attr('height', innerH);

  const x = d3.scaleLinear().range([0, innerW]);
  const y = d3.scaleLinear().range([innerH, 0]);

  const xAxisG = g.append('g')
    .attr('class', 'axis x')
    .attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class', 'axis y');

  // Labels
  g.append('text')
    .attr('class', 'x-label')
    .attr('x', innerW / 2)
    .attr('y', innerH + 36)
    .attr('text-anchor', 'middle')
    .attr('fill', '#c7d0dc')
    .text('North America Sales (M)');

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -48)
    .attr('text-anchor', 'middle')
    .attr('fill', '#c7d0dc')
    .text('Global Sales (M)');

  const pointsG = g.append('g').attr('class', 'points');
  const brushG  = g.append('g').attr('class', 'brush'); // atrás
const underlay  = g.append('g').attr('class', 'underlay').attr('clip-path', `url(#${clipId})`);
  const fitG      = g.append('g').attr('class', 'fit').attr('clip-path', `url(#${clipId})`);

  const palette = [
    '#60a5fa','#22d3ee','#a78bfa','#f472b6','#f59e0b','#ef4444',
    '#10b981','#d946ef','#93c5fd','#06b6d4','#f97316','#84cc16'
  ];
  function makeGenreColor(categories) {
    const map = new Map();
    categories.forEach((c,i)=>map.set(c, palette[i % palette.length]));
    return (c)=> map.get(c) || '#999';
  }

  const fmt = d3.format('.2f');

  function applyDim() {
    const pass = (d) => {
      const genreOK = !selectedGenre || d.Genre === selectedGenre;
      const densOK  = !densityFilter ||
        (densityFilter.group === 'top'  && d.Rank <= densityFilter.n) ||
        (densityFilter.group === 'rest' && d.Rank >  densityFilter.n);
      return genreOK && densOK;
    };
    d3.select(rootEl).selectAll('circle.point')
      .classed('dimmed', d => !pass(d))
      .attr('opacity', d => pass(d) ? 0.95 : 0.15);
  }

  // Brush 2d
  const brush = d3.brush()
    .extent([[0, 0], [innerW, innerH]])
    .on('start', () => { brushG.select('.overlay').style('cursor','crosshair'); })
    .on('end', (evt) => {
      brushG.select('.overlay').style('cursor','default');
      const sel = evt.selection;
      if (!sel) return;

      const [[x0,y0],[x1,y1]] = sel;
      const shift = evt.sourceEvent && evt.sourceEvent.shiftKey;
      const alt   = evt.sourceEvent && evt.sourceEvent.altKey;

      if (!alt)    xDomain = [x.invert(x0), x.invert(x1)];
      if (!shift)  yDomain = [y.invert(y1), y.invert(y0)];

      const dx = Math.abs(xDomain[1] - xDomain[0]);
      const dy = Math.abs(yDomain[1] - yDomain[0]);
      brushG.call(brush.move, null);
      if (dx < 1e-6 || dy < 1e-6) return;

      update();
    });
  brushG.call(brush);
  brushG.lower();

  // Reset zoom
  svg.on('dblclick', () => {
    xDomain = defaultX.slice();
    yDomain = defaultY.slice();
    update();
  });

  function linearRegression(data, xAcc, yAcc) {
    const n = data.length;
    if (n < 2) return null;
    let sumX=0, sumY=0, sumXX=0, sumYY=0, sumXY=0;
    for (const d of data) {
      const X = xAcc(d), Y = yAcc(d);
      sumX += X; sumY += Y;
      sumXX += X*X; sumYY += Y*Y; sumXY += X*Y;
    }
    const meanX = sumX/n, meanY = sumY/n;
    const varX = sumXX/n - meanX*meanX;
    const varY = sumYY/n - meanY*meanY;
    const covXY = sumXY/n - meanX*meanY;
    if (varX <= 0 || varY <= 0) return null;
    const slope = covXY / varX;
    const intercept = meanY - slope*meanX;
    const r = covXY / Math.sqrt(varX*varY);
    return { slope, intercept, r, n };
  }

  function update() {
    const rows = state.data.view.filter(d =>
      Number.isFinite(d.NA_Sales) && Number.isFinite(d.Global_Sales)
    );

    const maxX = d3.max(rows, d => d.NA_Sales)    || 1;
    const maxY = d3.max(rows, d => d.Global_Sales) || 1;

    if (!initializedDomains) {
      defaultX = [0, maxX];
      defaultY = [0, maxY];
      xDomain  = defaultX.slice();
      yDomain  = defaultY.slice();
      initializedDomains = true;
    }

    x.domain(xDomain).nice();
    y.domain(yDomain).nice();
    xAxisG.call(d3.axisBottom(x).ticks(6));
    yAxisG.call(d3.axisLeft(y).ticks(6));

    const byGenreCount = d3.rollup(rows, v => v.length, d => d.Genre || 'Unknown');
    const genresSorted = Array.from(byGenreCount.keys()).sort((a,b)=>byGenreCount.get(b)-byGenreCount.get(a));
    const categories   = genresSorted.slice(0, 12);
    const color = makeGenreColor(categories);

    const pts = pointsG.selectAll('circle.point')
      .data(rows, d => `${d.Name}|${d.Platform}|${d.Rank}`);

    pts.enter().append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.NA_Sales))
      .attr('cy', d => y(d.Global_Sales))
      .attr('r', 3.5)
      .attr('fill', d => color(d.Genre))
      .attr('opacity', 0.95)
      .on('mousemove', (evt, d) => {
        const [mx,my] = d3.pointer(evt, rootEl);
        const html = `
          <div><b>${d.Name}</b></div>
          <div><b>Genre:</b> ${d.Genre}</div>
          <div><b>NA Sales:</b> ${fmt(d.NA_Sales)} M</div>
          <div><b>Global Sales:</b> ${fmt(d.Global_Sales)} M</div>
        `;
        tip.html(html).style('left', (mx + 12) + 'px').style('top', (my + 12) + 'px').style('display','block');
      })
      .on('mouseleave', () => tip.style('display','none'))
      .on('click', (evt, d) => {
        bus.emit('SCATTER/SELECT/point', { name: d.Name, platform: d.Platform, genre: d.Genre });
      })
      .merge(pts)
      .transition().duration(200)
      .attr('cx', d => x(d.NA_Sales))
      .attr('cy', d => y(d.Global_Sales))
      .attr('fill', d => color(d.Genre));

    pts.exit().remove();

     const reg = linearRegression(rows, d => d.NA_Sales, d => d.Global_Sales);

    const fitData = reg ? (() => {
      const [x0, x1] = x.domain();
      return [
        [x0, reg.slope * x0 + reg.intercept],
        [x1, reg.slope * x1 + reg.intercept]
      ];
    })() : [];

    const fitLine = fitG.selectAll('path.reg-line').data(reg ? [fitData] : []);
    fitLine.enter().append('path')
      .attr('class', 'reg-line')
      .attr('fill', 'none')
      .attr('stroke', '#c7d0dc')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4')
      .attr('opacity', 0.9)
      .merge(fitLine)
      .transition().duration(200)
      .attr('d', d3.line().x(d => x(d[0])).y(d => y(d[1])));
    fitLine.exit().remove();

    const label = fitG.selectAll('text.reg-label').data(reg ? [reg] : []);
    label.enter().append('text')
      .attr('class', 'reg-label')
      .attr('x', 8)
      .attr('y', 12)
      .attr('fill', '#c7d0dc')
      .style('font-size', '12px')
      .merge(label)
      .text(d => `r = ${d3.format('.2f')(d.r)}`);
    label.exit().remove();

    if (legendEl) {
      renderLegend(legendEl, categories, (g)=>color(g), (label) => {
        selectedGenre = (selectedGenre === label) ? null : label;
        applyDim();
      });
    }

    pointsG.raise();
    brushG.lower();

    applyDim();
  }

  bus.on('DENSITY/SELECT/group', ({ group, n }) => {
    densityFilter = group ? { group, n } : null;
    applyDim();
  });
  bus.on('STACKED/SELECT/genre', (msg) => {
  const genre = (typeof msg === 'string' || msg == null) ? msg : (msg.genre ?? null);
  selectedGenre = genre || null;
  applyDim();
});

  bus.on('STATE/CHANGE', update);
  update();
}
