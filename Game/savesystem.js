// saveSystem.js

export function exportWorldToJson(worldName, seed, settings, changes) {
  const worldData = {
    name: worldName,
    seed: seed,
    settings: settings,
    changes: changes,
    exportDate: new Date().toISOString()
  };
  return JSON.stringify(worldData, null, 2);
}

export function downloadWorldFile(worldName, jsonString) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${worldName.toLowerCase().replace(/\s+/g, '_')}_save.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}