export function mountScoreRange(el, state, bus, onChange) {
  const [c0,c1] = state.filters.critic;
  const [u0,u1] = state.filters.user;
  el.innerHTML = `<h4>Scores</h4>
  <div class="score-row">
    <label>Critic:</label>
    <input id="cMin" type="number" step="1" value="${c0}" />
    <span class="dash">–</span>
    <input id="cMax" type="number" step="1" value="${c1}" />
  </div>
  <div class="score-row">
    <label>User:</label>
    <input id="uMin" type="number" step="0.1" value="${u0}" />
    <span class="dash">–</span>
    <input id="uMax" type="number" step="0.1" value="${u1}" />
  </div>`;
  const uMin = el.querySelector('#uMin'), uMax = el.querySelector('#uMax');
  function sync() {
    state.filters.critic = [Number(cMin.value||c0), Number(cMax.value||c1)];
    state.filters.user = [Number(uMin.value||u0), Number(uMax.value||u1)];
    onChange();
  }
  cMin.onchange = sync; cMax.onchange = sync; uMin.onchange = sync; uMax.onchange = sync;
}
