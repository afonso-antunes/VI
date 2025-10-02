export function mountRankRange(el, state, bus, onChange) {
  const [minR, maxR] = state.filters.rank;
  el.innerHTML = `<h4>Rank</h4>
  <input id="rMin" type="number" value="${minR}" style="width:45%" /> – 
  <input id="rMax" type="number" value="${maxR}" style="width:45%" />`;
  const rMin = el.querySelector('#rMin');
  const rMax = el.querySelector('#rMax');
  function sync() {
    state.filters.rank = [Number(rMin.value||minR), Number(rMax.value||maxR)];
    onChange();
  }
  rMin.onchange = sync; rMax.onchange = sync;
}
