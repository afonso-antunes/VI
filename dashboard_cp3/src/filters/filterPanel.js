import { mountGenrePicker } from './controls/genrePicker.js';
import { mountPublisherPicker } from './controls/publisherPicker.js';
//import { mountRegionPicker } from './controls/regionPicker.js';
import { mountPlatformPicker } from './controls/platformPicker.js';
import { mountDecadePicker } from './controls/decadePicker.js';
import { mountRankRange } from './controls/rangeRank.js';
import { mountScoreRange } from './controls/rangeScore.js';
import { mountSearchBox } from './controls/searchBox.js';

export function mountFilterPanel(panelEl, state, bus) {
  const pills = panelEl.querySelector('#activePills');

  function refreshPills() {
    pills.innerHTML = '';
    const pushPill = (label, removeFn) => {
      const div = document.createElement('div');
      div.className = 'pill';
      div.innerHTML = `<span>${label}</span>`;
      const btn = document.createElement('button'); btn.textContent='✕';
      btn.onclick = () => { removeFn(); refreshPills(); };
      div.appendChild(btn);
      pills.appendChild(div);
    };
    if (state.filters.search) pushPill(`Search: "${state.filters.search}"`, ()=>{ state.filters.search=''; });
    for (const g of state.filters.genres) pushPill(`Genre: ${g}`, ()=>{ state.filters.genres.delete(g); });
    for (const p of state.filters.publishers) pushPill(`Pub: ${p}`, ()=>{ state.filters.publishers.delete(p); });
    for (const p of state.filters.platforms) pushPill(`Plat: ${p}`, ()=>{ state.filters.platforms.delete(p); });
    for (const d of state.filters.decades) pushPill(`Decade: ${d}s`, ()=>{ state.filters.decades.delete(d); });
  }

  mountGenrePicker(panelEl.querySelector('#genrePicker'), state, bus, refreshPills);
  mountPublisherPicker(panelEl.querySelector('#publisherPicker'), state, bus, refreshPills);
  mountPlatformPicker(panelEl.querySelector('#platformPicker'), state, bus, refreshPills);
  mountDecadePicker(panelEl.querySelector('#decadePicker'), state, bus, refreshPills);
  mountRankRange(panelEl.querySelector('#rankRange'), state, bus, refreshPills);
  mountScoreRange(panelEl.querySelector('#scoreRange'), state, bus, refreshPills);
  mountSearchBox(panelEl.querySelector('#searchBox'), state, bus, refreshPills);

  panelEl.querySelector('#applyFilters').onclick = () => bus.emit('FILTERS/APPLY');
  panelEl.querySelector('#clearFilters').onclick = () => bus.emit('FILTERS/CLEAR');
}
