import { generateColumn } from './worldGen.js';
import { exportWorldToJson, downloadWorldFile } from './saveSystem.js';

const savedDataJSON = sessionStorage.getItem('activeWorld');
if (!savedDataJSON) {
  alert("No world data found! Returning to menu.");
  window.location.href = 'index.html';
}

const worldData = JSON.parse(savedDataJSON);
document.title = `${worldData.name} - 2D Minecraft`;
document.getElementById('worldTitle').innerText = worldData.name;
document.getElementById('worldSeed').innerText = worldData.seed;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Texture Manifest
const blockNames = [
  "grass_block_side", "dirt", "stone", "sand", "snow_block", "oak_log",
  "coal_ore", "copper_ore", "iron_ore", 
  "lapis_ore", "redstone_ore", "gold_ore", 
  "emerald_ore", "diamond_ore", "oak_log"
];

const textures = {};
let loadedTexturesCount = 0;

blockNames.forEach(name => {
  const img = new Image();
  img.src = `./textures/${name}.png`;
  img.onload = () => {
    loadedTexturesCount++;
    if (loadedTexturesCount === blockNames.length) {
      requestAnimationFrame(gameLoop);
    }
  };
  img.onerror = () => {
    console.warn(`Failed to load texture: ${name}.png (falling back to color)`);
    loadedTexturesCount++;
    if (loadedTexturesCount === blockNames.length) {
      requestAnimationFrame(gameLoop);
    }
  };
  textures[name] = img;
});

const tileSize = 40; // Zoomed-in FOV scale

const columnCache = {};
function getColumn(x) {
  if (!columnCache[x]) {
    columnCache[x] = generateColumn(x, worldData.seed, worldData.settings.maxWorldHeight);
  }
  return columnCache[x];
}

function isSolid(wx, wy) {
  const col = getColumn(wx);
  if (!col || wy < 0 || wy >= col.tiles.length) return false;
  const block = col.tiles[wy];
  return block !== "air" && block !== "water";
}

const player = {
  x: 0,
  y: 0,
  width: 24,
  height: 42,
  vx: 0,
  vy: 0,
  speed: 4.5,
  jumpForce: -11,
  grounded: false
};

const spawnCol = getColumn(0);
player.x = 0;
player.y = (spawnCol.surfaceY - 4) * tileSize;

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

document.getElementById('exportBtn').addEventListener('click', () => {
  const jsonStr = exportWorldToJson(worldData.name, worldData.seed, worldData.settings, worldData.changes);
  downloadWorldFile(worldData.name, jsonStr);
});

function updatePlayer() {
  player.vx = 0;
  if (keys['a'] || keys['arrowleft']) player.vx = -player.speed;
  if (keys['d'] || keys['arrowright']) player.vx = player.speed;

  player.x += player.vx;
  let pMinBlockX = Math.floor(player.x / tileSize);
  let pMaxBlockX = Math.floor((player.x + player.width - 1) / tileSize);
  let pMinBlockY = Math.floor(player.y / tileSize);
  let pMaxBlockY = Math.floor((player.y + player.height - 1) / tileSize);

  if (player.vx > 0) {
    if (isSolid(pMaxBlockX, pMinBlockY) || isSolid(pMaxBlockX, pMaxBlockY)) {
      player.x = pMaxBlockX * tileSize - player.width;
    }
  } else if (player.vx < 0) {
    if (isSolid(pMinBlockX, pMinBlockY) || isSolid(pMinBlockX, pMaxBlockY)) {
      player.x = (pMinBlockX + 1) * tileSize;
    }
  }

  player.vy += 0.55;
  if (player.vy > 14) player.vy = 14;
  player.y += player.vy;

  pMinBlockX = Math.floor(player.x / tileSize);
  pMaxBlockX = Math.floor((player.x + player.width - 1) / tileSize);
  pMinBlockY = Math.floor(player.y / tileSize);
  pMaxBlockY = Math.floor((player.y + player.height - 1) / tileSize);

  player.grounded = false;

  if (player.vy > 0) {
    if (isSolid(pMinBlockX, pMaxBlockY) || isSolid(pMaxBlockX, pMaxBlockY)) {
      player.y = pMaxBlockY * tileSize - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  } else if (player.vy < 0) {
    if (isSolid(pMinBlockX, pMinBlockY) || isSolid(pMaxBlockX, pMinBlockY)) {
      player.y = (pMinBlockY + 1) * tileSize;
      player.vy = 0;
    }
  }

  if ((keys['w'] || keys['arrowup'] || keys[' ']) && player.grounded) {
    player.vy = player.jumpForce;
    player.grounded = false;
  }
}

function gameLoop() {
  updatePlayer();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cameraX = player.x - canvas.width / 2 + player.width / 2;
  const cameraY = player.y - canvas.height / 2 + player.height / 2;

  const startX = Math.floor(cameraX / tileSize);
  const endX = startX + Math.ceil(canvas.width / tileSize) + 2;

  for (let x = startX; x < endX; x++) {
    const column = getColumn(x);
    
    for (let y = 0; y < column.tiles.length; y++) {
      const blockType = column.tiles[y];
      if (blockType === "air" || blockType === "water") continue;

      const screenX = (x * tileSize) - cameraX;
      const screenY = (y * tileSize) - cameraY;

      if (screenX < -tileSize || screenX > canvas.width || screenY < -tileSize || screenY > canvas.height) continue;

      const tex = textures[blockType];
      if (tex && tex.complete && tex.naturalWidth !== 0) {
        ctx.drawImage(tex, screenX, screenY, tileSize, tileSize);
      } else {
        ctx.fillStyle = blockType === "stone" ? "#7d7d7d" : "#866043";
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
      }
    }
  }

  const playerScreenX = player.x - cameraX;
  const playerScreenY = player.y - cameraY;
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(playerScreenX, playerScreenY, player.width, player.height);
  
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(playerScreenX + 12, playerScreenY + 8, 4, 4);

  requestAnimationFrame(gameLoop);
}