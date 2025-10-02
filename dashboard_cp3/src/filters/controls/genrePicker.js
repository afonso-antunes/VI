import { mountDropdownMulti } from './dropdownMulti.js';

export function mountGenrePicker(el, state, bus, onChange) {
  el.innerHTML = `<h4>Genre</h4><div id="dd-genre"></div>`;
  const host = el.querySelector('#dd-genre');

  mountDropdownMulti(host, {
    label: 'Select genres',
    searchable: true,
    options: () => state.lookups.genres,
    getLabel: g => g,
    isChecked: g => state.filters.genres.has(g),
    onToggle: g => {
      if (state.filters.genres.has(g)) state.filters.genres.delete(g);
      else state.filters.genres.add(g);
      onChange();
    },
    onAll: () => { state.lookups.genres.forEach(g => state.filters.genres.add(g)); onChange(); },
    onNone: () => { state.filters.genres.clear(); onChange(); }
  });
}
