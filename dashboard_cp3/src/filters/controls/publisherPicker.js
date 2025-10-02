import { mountDropdownMulti } from './dropdownMulti.js';

export function mountPublisherPicker(el, state, bus, onChange) {
  el.innerHTML = `<h4>Publisher</h4><div id="dd-pub"></div>`;
  const host = el.querySelector('#dd-pub');

  mountDropdownMulti(host, {
    label: 'Select publishers',
    searchable: true,
    options: () => state.lookups.publishers,                
    getLabel: p => p || '(Unknown)',
    isChecked: p => state.filters.publishers.has(p),
    onToggle: p => {
      if (state.filters.publishers.has(p)) state.filters.publishers.delete(p);
      else state.filters.publishers.add(p);
      onChange();
    },
    onAll: () => { state.lookups.publishers.forEach(p => state.filters.publishers.add(p)); onChange(); },
    onNone: () => { state.filters.publishers.clear(); onChange(); }
  });
}
