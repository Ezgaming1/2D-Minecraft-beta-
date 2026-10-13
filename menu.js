import { importWorldFromJsonFile } from './saveSystem.js';

function launchGame(worldData) {
  sessionStorage.setItem('activeWorld', JSON.stringify(worldData));
  window.open('game.html', '_blank');
}

document.getElementById('launchBtn').addEventListener('click', () => {
  const worldData = {
    name: document.getElementById('worldNameInput').value || "My World",
    seed: parseInt(document.getElementById('worldSeedInput').value) || 12345,
    settings: { maxWorldHeight: 120, chunkWidth: 32 },
    changes: []
  };
  launchGame(worldData);
});

const fileInput = document.getElementById('importFile');
document.getElementById('importBtn').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const loadedData = await importWorldFromJsonFile(file);
    launchGame(loadedData);
  } catch (err) {
    alert(err.message);
  }
});