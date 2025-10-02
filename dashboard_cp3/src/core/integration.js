export function wireIntegration(state, bus) {
  bus.on('STACKED/SELECT/genre', (g) => {
    console.log('[Integration] Genre selected:', g);
  });
  bus.on('STACKED/SELECT/segment', (seg) => {
    console.log('[Integration] Segment selected:', seg);
  });
}
