import { mountDropdownMulti } from './dropdownMulti.js';
export function mountRegionPicker(el, state, bus, onChange) {
  el.innerHTML = `<h4>Region</h4><div id="dd-region"></div>`;
  mountDropdownMulti(el.querySelector('#dd-region'), {
    label: 'Select regions',
    searchable: false,
    options: () => state.lookups.regions,
    getLabel: r => r,
    isChecked: r => state.filters.regions.has(r),
    onToggle: r => { state.filters.regions.has(r) ? state.filters.regions.delete(r) : state.filters.regions.add(r); onChange(); },
    onAll: () => { state.lookups.regions.forEach(r => state.filters.regions.add(r)); onChange(); },
    onNone: () => { state.filters.regions.clear(); onChange(); }
  });
}
