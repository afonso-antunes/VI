import { mountDropdownMulti } from './dropdownMulti.js';
export function mountPlatformPicker(el, state, bus, onChange) {
  el.innerHTML = `<h4>Platform</h4><div id="dd-plat"></div>`;
  mountDropdownMulti(el.querySelector('#dd-plat'), {
    label: 'Select platforms',
    searchable: true,
    options: () => state.lookups.platforms,
    getLabel: p => p,
    isChecked: p => state.filters.platforms.has(p),
    onToggle: p => { state.filters.platforms.has(p) ? state.filters.platforms.delete(p) : state.filters.platforms.add(p); onChange(); },
    onAll: () => { state.lookups.platforms.forEach(p => state.filters.platforms.add(p)); onChange(); },
    onNone: () => { state.filters.platforms.clear(); onChange(); }
  });
}
