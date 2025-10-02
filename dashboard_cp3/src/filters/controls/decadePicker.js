import { mountDropdownMulti } from './dropdownMulti.js';
export function mountDecadePicker(el, state, bus, onChange) {
  el.innerHTML = `<h4>Decade</h4><div id="dd-decade"></div>`;
  mountDropdownMulti(el.querySelector('#dd-decade'), {
    label: 'Select decades',
    searchable: false,
    options: () => state.lookups.decades,
    getLabel: d => d,
    isChecked: d => state.filters.decades.has(d),
    onToggle: d => { state.filters.decades.has(d) ? state.filters.decades.delete(d) : state.filters.decades.add(d); onChange(); },
    onAll: () => { state.lookups.decades.forEach(d => state.filters.decades.add(d)); onChange(); },
    onNone: () => { state.filters.decades.clear(); onChange(); }
  });
}
