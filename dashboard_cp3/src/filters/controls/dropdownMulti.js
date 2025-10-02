export function mountDropdownMulti(el, cfg) {
  const state = { open: false, q: "" };
  el.classList.add('dd');
  el.innerHTML = `
    <button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false">
      <span>${cfg.label}</span>
      <span class="dd-badge" id="dd-badge">0 selected</span>
    </button>
    <div class="dd-panel" role="listbox" tabindex="-1">
      ${cfg.searchable ? `<input class="dd-search" placeholder="type to filter...">` : ``}
      <div class="dd-actions">
        <button type="button" id="dd-all">All</button>
        <button type="button" id="dd-none">None</button>
      </div>
      <div class="dd-list"></div>
    </div>
  `;

  const btn = el.querySelector('.dd-btn');
  const panel = el.querySelector('.dd-panel');
  const list = el.querySelector('.dd-list');
  const badge = el.querySelector('#dd-badge');
  const input = el.querySelector('.dd-search');
  const btnAll = el.querySelector('#dd-all');
  const btnNone = el.querySelector('#dd-none');

  function countSelected() {
    return cfg.options().reduce((s,o)=> s + (cfg.isChecked(o) ? 1 : 0), 0);
  }

  function renderList() {
    const opts = cfg.options();
    const q = state.q.toLowerCase();
    const filtered = q ? opts.filter(o => cfg.getLabel(o).toLowerCase().includes(q)) : opts;

    list.innerHTML = '';
    filtered.forEach(o => {
      const id = 'dd-' + cfg.getLabel(o).replace(/[^a-z0-9_-]/ig,'_');
      const row = document.createElement('div');
      row.className = 'dd-row';
      row.setAttribute('role','option');
      row.innerHTML = `
        <input id="${id}" type="checkbox" ${cfg.isChecked(o) ? 'checked' : ''}/>
        <label for="${id}">${cfg.getLabel(o)}</label>
      `;

      const inputEl = row.querySelector('input');
      inputEl.addEventListener('change', (e) => {
        e.stopPropagation();
        cfg.onToggle(o);
        update();               
      });

      row.querySelector('label').addEventListener('mousedown', e => e.stopPropagation());
      row.querySelector('label').addEventListener('click', e => e.preventDefault());

      list.appendChild(row);
    });

    badge.textContent = `${countSelected()} selected`;
  }

  function open(v) {
    state.open = v;
    el.classList.toggle('open', v);
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) { renderList(); if (input) { input.value = state.q; input.focus(); } }
  }

  function update() {
    badge.textContent = `${countSelected()} selected`;
    if (state.open) renderList();
  }

  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    open(!state.open);
  });

  panel.addEventListener('mousedown', e => {
    e.stopPropagation();
  });

  document.addEventListener('mousedown', e => {
    if (!el.contains(e.target)) open(false);
  });

  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { open(false); btn.focus(); }
  });

  btnAll.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    cfg.onAll();    
    update();
  });

  btnNone.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    cfg.onNone();
    update();
  });

  if (input) input.oninput = () => { state.q = input.value; renderList(); };

  renderList();
  return { update, open };
}
