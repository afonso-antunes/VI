export function mountAlluvial(rootEl, toggleEl, toggleLabelEl, legendEl, state, bus) {
  const margin = { top: 24, right: 16, bottom: 24, left: 16 };
  const width  = rootEl.clientWidth;
  const height = rootEl.clientHeight || 420;

  const svg = d3.select(rootEl).append('svg')
    .attr('width', width)
    .attr('height', height);

  const tip = d3.select(rootEl)
    .style('position','relative')
    .append('div')
    .attr('class','tooltip');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .classed('alluvial', true);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  // ---- estado ----
  let rightMode = 'genre';           // modo inicial: Genres
  let selectedKey = null;            
  let lastPayload = null;            

  const palette = [
    '#60a5fa','#22d3ee','#a78bfa','#f472b6','#f59e0b','#ef4444',
    '#10b981','#d946ef','#93c5fd','#06b6d4','#f97316','#84cc16'
  ];
  const fmt = d3.format('.2f');

  const REGIONS = new Set(['North America','Europe','Japan','Other']);
  const regions = [
    { id: 'North America', col: 'NA_Sales',    short: 'NA'    },
    { id: 'Europe',        col: 'EU_Sales',    short: 'EU'    },
    { id: 'Japan',         col: 'JP_Sales',    short: 'JP'    },
    { id: 'Other',         col: 'Other_Sales', short: 'Other' }
  ];

  function syncToggle() {
    if (!toggleEl || !toggleLabelEl) return;
    if (toggleEl.checked !== true) toggleEl.checked = true; // default: Genres
    rightMode = toggleEl.checked ? 'genre' : 'platform';
    toggleLabelEl.textContent = rightMode === 'genre' ? 'Genres' : 'Platforms';
  }
  if (toggleEl) {
    toggleEl.addEventListener('change', () => { syncToggle(); update(); });
    syncToggle();
  }

  function makeColor(categories) {
    const map = new Map();
    categories.forEach((c,i)=>map.set(c, palette[i % palette.length]));
    return (c)=> map.get(c) || '#999';
  }

  const linkKey = d => `link|${d.region}|${d.category}`;
  const nodeKey = (side, name) => `node|${side}|${name}`;

  function buildLinks(rows) {
    const rightKey = rightMode === 'genre' ? 'Genre' : 'Platform';

    const byCat = d3.rollup(
      rows, v => d3.sum(v, d => (d.Global_Sales || 0)), d => d[rightKey] || 'Unknown'
    );
    const catsSorted = Array.from(byCat.entries()).sort((a,b)=>b[1]-a[1]).map(d=>d[0]);
    const topCats = catsSorted.slice(0, 12);
    const color = makeColor(topCats);

    const linksRaw = [];
    for (const r of rows) {
      const cat = r[rightKey] || 'Unknown';
      for (const reg of regions) {
        const v = +r[reg.col] || 0;
        if (v > 0) linksRaw.push({ region: reg.id, category: cat, value: v });
      }
    }
    const agg = d3.rollup(linksRaw, v => d3.sum(v, d => d.value), d => d.region, d => d.category);
    const flat = [];
    for (const [region, cats] of agg.entries()) {
      for (const [cat, value] of cats.entries()) flat.push({ region, category: cat, value });
    }

    const totalByRegion = d3.rollup(flat, v=>d3.sum(v,d=>d.value), d=>d.region);
    const totalByCat    = d3.rollup(flat, v=>d3.sum(v,d=>d.value), d=>d.category);

    const regionsOrder = Array.from(totalByRegion.entries()).sort((a,b)=>b[1]-a[1]).map(d=>d[0]);
    const catsOrder    = Array.from(totalByCat.entries()).sort((a,b)=>b[1]-a[1]).map(d=>d[0]);

    return { links: flat, color, regionsOrder, catsOrder, topCats };
  }

  function draw(payload) {
    lastPayload = payload;

    const { links, color, regionsOrder, catsOrder } = payload;

    const regScale = d3.scaleBand().domain(regionsOrder).range([0, innerH]).padding(0.15);
    const catScale = d3.scaleBand().domain(catsOrder).range([0, innerH]).padding(0.06);

    const maxValue = d3.max(links, d=>d.value) || 1;
    const widthScale = d3.scaleLinear().domain([0, maxValue]).range([1, 20]).nice();

    const leftX  = 0;
    const rightX = innerW - 110;

    g.selectAll('*').remove();

    const ribbonPath = (d) => {
      const y1 = regScale(d.region) + regScale.bandwidth()/2;
      const y2 = catScale(d.category) + catScale.bandwidth()/2;
      const p = d3.path();
      p.moveTo(leftX + 90, y1);
      p.bezierCurveTo(leftX + 200, y1, rightX - 200, y2, rightX, y2);
      return p.toString();
    };

    // links
    const linksG = g.append('g').attr('class','links');

    linksG.selectAll('path.flow')
      .data(links, linkKey)
      .join('path')
      .attr('class','flow')
      .attr('fill','none')
      .attr('stroke', d => color(d.category))
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', d => widthScale(d.value))
      .attr('d', ribbonPath);

    linksG.selectAll('path.flow-hit')
      .data(links, linkKey)
      .join('path')
      .attr('class','flow-hit')
      .attr('fill','none')
      .attr('stroke','transparent')
      .attr('stroke-width', 24)
      .style('pointer-events','stroke')
      .attr('d', ribbonPath)
      .on('mousemove', (evt, d) => {
        const [mx,my] = d3.pointer(evt, rootEl);
        tip.html(`
          <div><b>${d.region} → ${d.category}</b></div>
          <div><b>Sales:</b> ${fmt(d.value)} M</div>
        `)
        .style('left', (mx + 12) + 'px')
        .style('top',  (my + 12) + 'px')
        .style('display','block');
      })
      .on('mouseleave', () => tip.style('display','none'))
      .on('click', (evt, d) => {
        evt.stopPropagation();
        toggleSelect(linkKey(d), payload);
        broadcastSelection({ type: 'link', region: d.region, category: d.category });
      });

    g.append('g').attr('class','regions')
      .selectAll('text.node-label.left')
      .data(regionsOrder, d => d)
      .join('text')
      .attr('class','node-label left')
      .attr('x', leftX)
      .attr('y', d => regScale(d) + regScale.bandwidth()/2)
      .attr('fill','#c7d0dc')
      .attr('font-size','12px')
      .attr('alignment-baseline','middle')
      .style('cursor','pointer')
      .text(d => d)
      .on('click', (evt, d) => {
        evt.stopPropagation();
        toggleSelect(nodeKey('left', d), payload);
        broadcastSelection({ type: 'node-left', region: d });
      });

    g.append('g').attr('class','cats')
      .selectAll('text.node-label.right')
      .data(catsOrder, d => d)
      .join('text')
      .attr('class','node-label right')
      .attr('x', rightX + 6)
      .attr('y', d => catScale(d) + catScale.bandwidth()/2)
      .attr('fill','#c7d0dc')
      .attr('font-size','12px')
      .attr('alignment-baseline','middle')
      .style('cursor','pointer')
      .text(d => d)
      .on('click', (evt, d) => {
        evt.stopPropagation();
        toggleSelect(nodeKey('right', d), payload);
        broadcastSelection({ type: 'node-right', category: d });
      });

    if (legendEl) {
      const cats = catsOrder.slice(0, 12);
      legendEl.innerHTML = '';
      const wrap = d3.select(legendEl);
      const items = wrap.selectAll('div.leg-item').data(cats, d=>d);
      const ent = items.enter().append('div')
        .attr('class','leg-item')
        .style('display','inline-flex')
        .style('align-items','center')
        .style('gap','8px')
        .style('margin','2px 10px 0 0');
      ent.append('span')
        .style('display','inline-block')
        .style('width','12px')
        .style('height','12px')
        .style('border-radius','3px')
        .style('background', d => payload.color(d));
      ent.append('span').text(d => d);
      items.exit().remove();
    }

    applySelection(payload);
  }

  function applySelection(payload) {
    const { links } = payload;

    let activeLeft  = new Set();
    let activeRight = new Set();
    let activeLinks = new Set();

    if (selectedKey) {
      const [kind, a, b] = selectedKey.split('|'); 
      if (kind === 'link') {
        activeLeft.add(a); activeRight.add(b); activeLinks.add(`${a}|${b}`);
      } else if (kind === 'node' && a === 'left') {
        activeLeft.add(b);
        links.forEach(l => { if (l.region === b) { activeRight.add(l.category); activeLinks.add(`${l.region}|${l.category}`); }});
      } else if (kind === 'node' && a === 'right') {
        activeRight.add(b);
        links.forEach(l => { if (l.category === b) { activeLeft.add(l.region); activeLinks.add(`${l.region}|${l.category}`); }});
      }
    }

    g.selectAll('.flow')
      .classed('dimmed', function(d){
        if (!selectedKey) return false;
        const k = `${d.region}|${d.category}`;
        return !activeLinks.has(k);
      });

    g.selectAll('.node-label.left')
      .classed('dimmed-node', d => selectedKey ? !activeLeft.has(d) : false);
    g.selectAll('.node-label.right')
      .classed('dimmed-node', d => selectedKey ? !activeRight.has(d) : false);
  }

  function toggleSelect(newKey, payload) {
    selectedKey = (selectedKey === newKey) ? null : newKey;
    applySelection(payload);
  }

  function broadcastSelection(info) {
    if (!info) return;

    if (info.type === 'node-right' || info.type === 'link') {
      const category = info.category;
      if (rightMode === 'genre') {
        bus.emit('LINE/SELECT/genre',   { genre: category || null });
        bus.emit('STACKED/SELECT/genre',{ genre: category || null });
      } else {
        bus.emit('ALLUVIAL/SELECT/platform', { platform: category || null });
      }
    } else if (info.type === 'node-left') {
      bus.emit('ALLUVIAL/SELECT/region', { region: info.region || null });
    }

    if (!selectedKey) {
      if (rightMode === 'genre') {
        bus.emit('LINE/SELECT/genre',   { genre: null });
        bus.emit('STACKED/SELECT/genre',{ genre: null });
      } else {
        bus.emit('ALLUVIAL/SELECT/platform', { platform: null });
      }
      bus.emit('ALLUVIAL/SELECT/region', { region: null });
    }
  }

  d3.select(document).on('click.alluvialClear', (evt) => {
    if (!rootEl.contains(evt.target) && selectedKey) {
      selectedKey = null;
      applySelection(lastPayload || { links: [] });
      broadcastSelection(null);
    }
  });

  function normalizeRegionName(k) {
  if (!k) return null;
  const key = String(k).toLowerCase().trim();
  if (key === 'NA' || key === 'North America' || key === 'na_sales') return 'North America';
  if (key === 'EU' || key === 'Europe'        || key === 'eu_sales') return 'Europe';
  if (key === 'JP' || key === 'Japan'         || key === 'jp_sales') return 'Japan';
  if (key === 'OTHER' || key === 'other_sales') return 'Other';
  return null;
}

    bus.on('STACKED/SELECT/segment', ({ key }) => {
    const region = normalizeRegionName(key);
    if (!region) return;                          
    selectedKey = `node|left|${region}`;          
    applySelection(lastPayload || { links: [] });
    bus.emit('ALLUVIAL/SELECT/region', { region }); 
    });

  function update() {
    const rows = state.data.view.filter(d =>
      Number.isFinite(d.Global_Sales) &&
      Number.isFinite(d.NA_Sales) &&
      Number.isFinite(d.EU_Sales) &&
      Number.isFinite(d.JP_Sales) &&
      Number.isFinite(d.Other_Sales)
    );
    const payload = buildLinks(rows);
    draw(payload);
  }

  bus.on('STATE/CHANGE', update);
  update();
}
