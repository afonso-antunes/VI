export function mountSearchBox(el, state, bus, onChange) {
  el.innerHTML = `<h4>Search</h4><input id="q" placeholder="Game name..." />`;
  const q = el.querySelector('#q');
  q.oninput = () => { state.filters.search = q.value; onChange(); };
}
