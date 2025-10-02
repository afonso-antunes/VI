export function renderLegend(rootEl, items, color, onClick) {
  const root = d3.select(rootEl);
  const sel = root.selectAll('.legend-item').data(items, d => d);
  const enter = sel.enter().append('div').attr('class','legend-item').style('cursor','pointer')
    .on('click', (_, d) => onClick?.(d));
  enter.append('div').attr('class','legend-swatch').style('background', d => color(d));
  enter.append('div').text(d => d);
  sel.exit().remove();
}
