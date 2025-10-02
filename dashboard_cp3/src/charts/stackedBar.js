import { renderLegend } from '../core/legend.js';

export function mountStackedBar(rootEl, legendEl, state, bus) {
    const margin = { top: 24, right: 16, bottom: 64, left: 56 };
    const width = rootEl.clientWidth;
    const height = rootEl.clientHeight;
    const svg = d3.select(rootEl).append('svg')
    .attr('width', width).attr('height', height);

    const tip = d3.select(rootEl)
    .style('position','relative') 
    .append('div')
    .attr('class','tooltip');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3.scaleBand().paddingInner(0.2).paddingOuter(0.05).range([0, innerW]);
    const y = d3.scaleLinear().range([innerH, 0]);

    const xAxisG = g.append('g').attr('class', 'axis x').attr('transform', `translate(0,${innerH})`);
    const yAxisG = g.append('g').attr('class', 'axis y');
    const yLabel = yAxisG.append('text')
    .attr('class', 'y-label')
    .attr('fill', '#c7d0dc')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -40);

    const barsG = g.append('g').attr('class', 'bars');

    function update() {
        const { data, series, color, genres } = state.getStacked();

        x.domain(genres);
        const yMax = d3.max(data, d => d.__total) || 1;
        y.domain([0, yMax]);

        yLabel
        .attr('x', -innerH / 2) 
        .text(state.normalize ? '% of Global Sales' : 'Sum of Global Sales (M)');

        const stackGen = d3.stack().keys(series);
        const stacked = stackGen(data);

        const genreG = barsG.selectAll('.bar').data(stacked, d => d.key);
        genreG.enter().append('g')
            .attr('class', d => `bar series-${cssSafe(d.key)}`)
            .attr('fill', d => color(d.key))
            .merge(genreG)
            .each(function(seriesData) {
                const gSeries = d3.select(this);
                const rects = gSeries.selectAll('rect').data(seriesData, d => d.data.Genre);
                rects.enter().append('rect')
                .attr('class', 'segment')
                .attr('x', d => x(d.data.Genre))
                .attr('y', innerH)
                .attr('height', 0)
                .attr('width', x.bandwidth())
                .on('mousemove', function(evt, d) {
                const key = seriesData.key;
                hoverSegment(key, d.data.Genre, d[1]-d[0], d.data.__total, this);
                })
                .on('mouseleave', () => hoverSegment(null))
                .on('click', (evt, d) => {
                    const key   = seriesData.key;         
                    const genre = d.data.Genre;
                    const val   = d[1] - d[0];            
                    const abs   = state.normalize ? (val * d.data.__totalAbs) : val; 
                    const pct   = state.normalize ? ` <span class="muted">(${d3.format('.0%')(val)})</span>` : '';
                    const label = state.mode === 'region' ? 'Region' : 'Publisher';

                    const [mx,my] = d3.pointer(evt, rootEl);
                    const html = `
                        <div><b>${label}:</b> ${key}</div>
                        <div><b>Genre:</b> ${genre}</div>
                        <div><b>Number of Sales:</b> ${d3.format('.2f')(abs)} M${pct}</div>
                    `;
                    showTip(html, [mx,my]);

                    bus.emit('STACKED/SELECT/segment', { key, genre });
                })
                .merge(rects)
                .transition().duration(250)
                .attr('x', d => x(d.data.Genre))
                .attr('y', d => y(d[1]))
                .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
                .attr('width', x.bandwidth());

                rects.exit().remove();
            });

        genreG.exit().remove();

        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y).ticks(6).tickFormat(v => state.normalize ? d3.format('.0%')(v) : v);

        xAxisG.call(xAxis).selectAll('text').attr('transform', 'rotate(-35)').style('text-anchor','end');
        yAxisG.call(yAxis);

        renderLegend(legendEl, series, (s)=>color(s), (s)=>{
            bus.emit('STACKED/SELECT/segment', { key: s, genre: null });
        });

        const sel = state.selection.segment;
        d3.select(rootEl).selectAll('.segment').classed('dimmed', function() {
            if (!sel) return false;
            const parentKey = this.parentNode.__data__.key;
            return parentKey !== sel.key;
        });
        d3.select(document).on('click.stackedTip', (evt) => {
            if (!rootEl.contains(evt.target)) hideTip();
        });
    }

    function hoverSegment(key, genre, val, total, el) {
        if (!key) {
            d3.selectAll('.segment').classed('dimmed', false);
            return;
        }
        d3.selectAll('.segment').classed('dimmed', true);
        d3.select(el).classed('dimmed', false);
        const pct = state.normalize ? d3.format('.0%')(val) : d3.format('.2f')(val);
        d3.select(el).attr('title', `${genre} — ${key}: ${pct}${state.normalize?'':' M'}`);
    }

    function showTip(html, [x0,y0]) {
        tip.html(html)
            .style('left', (x0 + 12) + 'px')
            .style('top',  (y0 + 12) + 'px')
            .style('display', 'block');
    }
    function hideTip(){ tip.style('display','none'); }


    function cssSafe(s) { return s.replace(/[^a-z0-9_-]/ig,'_'); }

    bus.on('STATE/CHANGE', update);

    xAxisG.on('click', function(event) {
        const [mx] = d3.pointer(event);
        const gName = x.domain().find(gn => {
            const x0 = x(gn), x1 = x0 + x.bandwidth();
            return mx >= x0 && mx <= x1;
        });
        if (gName) bus.emit('STACKED/SELECT/genre', gName);
    });

    update();
}
