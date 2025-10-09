import { renderLegend } from '../core/legend.js';

export function mountDensitySales(rootEl, legendEl, state, bus) {
  const RANK_THRESHOLD = 1500; 
  const margin = { top: 24, right: 16, bottom: 56, left: 56 };
  const width  = rootEl.clientWidth;
  const height = rootEl.clientHeight || 320;
  const defaultX = [0, 8];
  const defaultY = [0, 1.0];

  let xDomain = defaultX.slice();
  let yDomain = defaultY.slice();

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

  const x = d3.scaleLinear().range([0, innerW]);
  const y = d3.scaleLinear().range([innerH, 0]);

  const xAxisG = g.append('g')
    .attr('class', 'axis x')
    .attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class', 'axis y');

  // labels
  g.append('text')
    .attr('class', 'x-label')
    .attr('x', innerW / 2)
    .attr('y', innerH + 36)
    .attr('text-anchor', 'middle')
    .attr('fill', '#c7d0dc')
    .text('Global Sales (Millions)');

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#c7d0dc')
    .text('Density');

  const pathsG = g.append('g').attr('class', 'density-paths');

  const colors = { top: '#34d399', rest: '#f87171' };

  function kernelEpanechnikov(k) {
    return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  }
  function kde(kernel, X, sample) {
    return X.map(x => [x, d3.mean(sample, v => kernel(x - v))]);
  }

  const fmtPct   = d3.format('.1%');
  const fmtSales = d3.format('.2f');
  const fmtDen   = d3.format('.3f');
  function showTip(html, [x0,y0]) {
    tip.html(html)
      .style('left', (x0 + 12) + 'px')
      .style('top',  (y0 + 12) + 'px')
      .style('display', 'block');
  }
  function hideTip(){ tip.style('display','none'); }

  let selectedKey = null; 
  function applySelectionStyles() {
    d3.select(rootEl)
      .selectAll('.density-paths .line, .density-paths .hit')
      .attr('display', d => (selectedKey && d.key !== selectedKey) ? 'none' : null);
  }
  function toggleSelect(key) {
    selectedKey = (selectedKey === key) ? null : key;
    applySelectionStyles();
    const group = selectedKey; 
    bus.emit('DENSITY/SELECT/group', { group, n: RANK_THRESHOLD });
  }

  function update() {
    const { salesTop, salesRest } = state.getDensity(RANK_THRESHOLD);

    if (!salesTop.length && !salesRest.length) {
      pathsG.selectAll('path').remove();
      if (legendEl) legendEl.innerHTML = '';
      return;
    }

    const fixedXMax = 8;
    const fixedYMax = 1.0;
    const X = d3.range(0, fixedXMax, fixedXMax / 200);

    const series = [];
    if (salesTop.length) {
      const bwTop = Math.max(0.1, 1.06 * d3.deviation(salesTop) * Math.pow(salesTop.length, -1/5));
      series.push({ key: 'top', label: `Top ${RANK_THRESHOLD}`, values: kde(kernelEpanechnikov(bwTop), X, salesTop) , sampleSorted: salesTop.slice().sort(d3.ascending)});
    }
    if (salesRest.length) {
      const bwRest = Math.max(0.1, 1.06 * d3.deviation(salesRest) * Math.pow(salesRest.length, -1/5));
      series.push({ key: 'rest', label: `Rank > ${RANK_THRESHOLD}`, values: kde(kernelEpanechnikov(bwRest), X, salesRest), sampleSorted: salesRest.slice().sort(d3.ascending) });
    }

    if (selectedKey && !series.some(s => s.key === selectedKey)) selectedKey = null;

    x.domain(xDomain);
    y.domain(yDomain);

    xAxisG.call(d3.axisBottom(x).ticks(6));
    yAxisG.call(d3.axisLeft(y).ticks(5));
    const brushG = g.append('g').attr('class', 'brush');

    svg.on('dblclick', () => {
      xDomain = defaultX.slice();
      yDomain = defaultY.slice();
      update();
    });
    const line = d3.line()
      .curve(d3.curveBasis)
      .x(d => x(d[0]))
      .y(d => y(d[1]));
      
      let focus = g.selectAll('.focus-dot').data([0]);
    focus = focus.enter().append('circle')
      .attr('class','focus-dot')
      .attr('r', 3)
      .attr('fill', '#c7d0dc')
      .attr('opacity', 0)
      .merge(focus);
      
      
      const seriesG = pathsG.selectAll('g.series').data(series, d => d.key);
      const seriesEnter = seriesG.enter().append('g').attr('class', 'series');
      
    seriesEnter.append('path')
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', d => colors[d.key])
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
    .attr('d', d => line(d.values));
    
    seriesEnter.append('path')
    .attr('class', 'hit')
    .attr('fill', 'none')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 50)                 
    .style('pointer-events', 'stroke')      
    .attr('d', d => line(d.values))
    .on('click', function(evt, d) {
      toggleSelect(d.key);
      this.parentNode.parentNode.appendChild(this.parentNode);
    })
    .on('mouseenter', () => { focus.attr('opacity', 1); })
    .on('mousemove', (evt, d) => {
      const [gx, gy] = d3.pointer(evt, g.node());      
      const xVal = Math.max(0, Math.min(fixedXMax, x.invert(gx)));
      
      const xs = d.values.map(v => v[0]);
      const i  = d3.bisectCenter(xs, xVal);
      const x0 = d.values[i][0];
      const y0 = d.values[i][1];
      
      const j = d3.bisectRight(d.sampleSorted, x0);
      const p = j / d.sampleSorted.length;

      focus.attr('cx', x(x0)).attr('cy', y(y0)).attr('fill', colors[d.key]);
      const [mx,my] = d3.pointer(evt, rootEl);
      const html = `
      <div><b>${d.label}</b></div>
      <div><b>Global Sales:</b> ${fmtSales(x0)} M</div>
        <div><b>Percentile:</b> ${fmtPct(p)}</div>
        <div><b>Density:</b> ${fmtDen(y0)}</div>
      `;
      showTip(html, [mx,my]);
    })
    .on('mouseleave', () => { hideTip(); focus.attr('opacity', 0); })

    seriesG.merge(seriesEnter).select('path.line')
    .transition().duration(250)
      .attr('stroke', d => colors[d.key])
      .attr('d', d => line(d.values));

      seriesG.merge(seriesEnter).select('path.hit')
      .attr('d', d => line(d.values));
      
      seriesG.exit().remove();
    const brush = d3.brush()
    .extent([[0, 0], [innerW, innerH]])
    .on('end', (evt) => {
      const sel = evt.selection;
      if (!sel) return; 

      const [[x0, y0], [x1, y1]] = sel;

      const shift = evt.sourceEvent && evt.sourceEvent.shiftKey;
      const alt   = evt.sourceEvent && evt.sourceEvent.altKey;

      if (!alt) xDomain = [x.invert(x0), x.invert(x1)];
      if (!shift) yDomain = [y.invert(y1), y.invert(y0)]; 

      const dx = Math.abs(xDomain[1] - xDomain[0]);
      const dy = Math.abs(yDomain[1] - yDomain[0]);
      if (dx < 1e-6 || dy < 1e-6) {
        brushG.call(brush.move, null);
        return;
      }

      brushG.call(brush.move, null); 
      update(); 
    });
      
    brushG.call(brush);
    brushG.lower();
    applySelectionStyles();

    if (legendEl) {
      const legendItems = series.map(d => d.label);
      const colorFn = (label) => label.startsWith('Top') ? colors.top : colors.rest;
      d3.select(legendEl).on('click.densityLegend', null);

      renderLegend(legendEl, legendItems, colorFn, (label) => {
      const key = label.startsWith('Top') ? 'top' : 'rest';
      toggleSelect(key);
  });
    }
  }

  d3.select(document).on('click.densityClear', (evt) => {
    if (!rootEl.contains(evt.target)) {
      if (selectedKey !== null) {
        selectedKey = null;
        applySelectionStyles();
        bus.emit('DENSITY/SELECT/group', { group: null, n: RANK_THRESHOLD });
      }
    }
  });

  bus.on('STATE/CHANGE', update);
  update();
}
