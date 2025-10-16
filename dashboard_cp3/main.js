import { preprocess } from './src/core/preprocess.js';
import { createState } from './src/core/state.js';
import { createBus } from './src/core/eventBus.js';
import { mountStackedBar } from './src/charts/stackedBar.js';
import { mountFilterPanel } from './src/filters/filterPanel.js';
import { mountDensitySales } from './src/charts/density.js';
import { mountScatter } from './src/charts/scatter.js';
import { mountMultiLine } from './src/charts/multiLine.js';
import { mountAlluvial } from './src/charts/alluvial.js';

const bus = createBus();

(async function init() {
    const csvPath = 'assets/vgsales_with_ratings_decades.csv';
    const data = await d3.csv(csvPath);
    const pre = preprocess(data);

    const state = createState(pre, bus);
    window.__STATE__ = state; 

    const modeToggle = document.getElementById('stackedModeToggle');
    const modeLabel  = document.getElementById('stackedModeLabel');
    const normalizeToggle = document.getElementById('stackedNormalizeToggle');

    function syncToggles() {
        modeToggle.checked = (state.mode === 'region');
        modeLabel.textContent = state.mode === 'region' ? 'Region' : 'Publisher';
        normalizeToggle.checked = state.normalize;
    }
    syncToggles();

    modeToggle.addEventListener('change', () => {
        bus.emit('MODE/CHANGE', modeToggle.checked ? 'region' : 'publisher');
    });
    normalizeToggle.addEventListener('change', () => {
        bus.emit('NORMALIZE/TOGGLE', normalizeToggle.checked);
    });

    mountFilterPanel(document.getElementById('filterPanel'), state, bus);
    mountStackedBar(document.getElementById('stackedRoot'),document.getElementById('legendRoot'),state,bus);

    const densitySalesRoot = document.getElementById('densitySalesRoot');
    if (densitySalesRoot) {
        mountDensitySales(densitySalesRoot, document.getElementById('densityLegend'), state, bus);}
        
    const scatterRoot = document.getElementById('scatterRoot');
    if (scatterRoot) {
    mountScatter(scatterRoot, document.getElementById('scatterLegend'), state, bus);}

    const multiLineRoot = document.getElementById('multiLineRoot');
    if (multiLineRoot) {
    mountMultiLine(multiLineRoot, document.getElementById('lineMetricToggle'), state, bus);}

    const alluvialRoot = document.getElementById('alluvialRoot');
    if (alluvialRoot) {
        mountAlluvial(
            alluvialRoot,
            document.getElementById('alluvialToggle'),
            document.getElementById('alluvialLabel'),
            document.getElementById('alluvialLegend'),
            state,
            bus);
    }

    bus.on('STATE/CHANGE', syncToggles);
})();
