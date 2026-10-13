// worldGen.js

function hash(n) {
  let x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function noise2D(x, y, seed) {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const fx = x - X;
  const fy = y - Y;

  const s = fx * fx * (3 - 2 * fx);
  const t = fy * fy * (3 - 2 * fy);

  const n00 = hash(X + Y * 57 + seed);
  const n10 = hash(X + 1 + Y * 57 + seed);
  const n01 = hash(X + (Y + 1) * 57 + seed);
  const n11 = hash(X + 1 + (Y + 1) * 57 + seed);

  const nx0 = n00 * (1 - s) + n10 * s;
  const nx1 = n01 * (1 - s) + n11 * s;
  return nx0 * (1 - t) + nx1 * t;
}

export const biomes = {
  ocean: {
    name: "ocean",
    baseHeight: 30,
    hillScale: 40,
    hillAmplitude: 6,
    surfaceBlock: "sand",
    subsurfaceBlock: "sand",
    deepBlock: "stone",
    subsurfaceDepth: 4,
    seaLevel: 38,
    hasTrees: false,
  },
  desert: {
    name: "desert",
    baseHeight: 39,
    hillScale: 35,
    hillAmplitude: 8,
    surfaceBlock: "sand",
    subsurfaceBlock: "sand",
    deepBlock: "stone",
    subsurfaceDepth: 5,
    hasTrees: false,
  },
  plains: {
    name: "plains",
    baseHeight: 40,
    hillScale: 35,
    hillAmplitude: 10,
    surfaceBlock: "grass_block_side",
    subsurfaceBlock: "dirt",
    deepBlock: "stone",
    subsurfaceDepth: 4,
    hasTrees: true,
    treeChance: 0.15,
  },
  forest: {
    name: "forest",
    baseHeight: 43,
    hillScale: 30,
    hillAmplitude: 14,
    surfaceBlock: "grass_block_side",
    subsurfaceBlock: "dirt",
    deepBlock: "stone",
    subsurfaceDepth: 4,
    hasTrees: true,
    treeChance: 0.35,
  },
  tundra: {
    name: "tundra",
    baseHeight: 45,
    hillScale: 25,
    hillAmplitude: 12,
    surfaceBlock: "snow_block",
    subsurfaceBlock: "dirt",
    deepBlock: "stone",
    subsurfaceDepth: 4,
    hasTrees: true,
    treeChance: 0.10,
  }
};

export function getBiomeWeights(x, seed) {
  const n = noise2D(x * 0.003, 0, seed + 999);
  if (n < 0.20) return biomes.ocean;
  if (n < 0.40) return biomes.desert;
  if (n < 0.65) return biomes.plains;
  if (n < 0.85) return biomes.forest;
  return biomes.tundra;
}

export function getTerrainHeight(x, seed) {
  const mainHills = noise2D(x * 0.02, 0, seed);
  const bumps = noise2D(x * 0.08, 0, seed + 1);

  return Math.floor(
    38 + 
    (mainHills - 0.5) * 22 + 
    (bumps - 0.5) * 5
  );
}

export function isCave(x, y, seed) {
  const n = noise2D(x * 0.06, y * 0.06, seed + 444);
  return n > 0.46 && n < 0.52;
}

export function getUndergroundBlock(x, y, surfaceY, seed, defaultBlock) {
  const depth = y - surfaceY;

  if (depth > 4) {
    const clusterHash = hash(x * 12.9898 + y * 78.233 + seed * 53.11);
    
    if (clusterHash > 0.94) {
      const typeSelector = hash(Math.floor(x / 2) * 31 + Math.floor(y / 2) * 17 + seed);

      if (depth > 65 && typeSelector > 0.88) return "diamond_ore";
      if (depth > 55 && typeSelector > 0.78 && typeSelector <= 0.88) return "emerald_ore";
      if (depth > 45 && typeSelector > 0.65 && typeSelector <= 0.78) return "gold_ore";
      if (depth > 35 && typeSelector > 0.50 && typeSelector <= 0.65) return "redstone_ore";
      if (depth > 30 && typeSelector > 0.38 && typeSelector <= 0.50) return "lapis_ore";
      if (depth > 15 && typeSelector > 0.22 && typeSelector <= 0.38) return "iron_ore";
      if (depth > 12 && typeSelector > 0.10 && typeSelector <= 0.22) return "copper_ore";
      if (depth > 4 && typeSelector <= 0.10) return "coal_ore";
    }
  }

  return defaultBlock;
}

export function generateColumn(x, seed, maxWorldHeight = 120) {
  const biome = getBiomeWeights(x, seed);
  const surfaceY = getTerrainHeight(x, seed);
  const tiles = [];

  let hasTreeHere = false;
  if (biome.hasTrees) {
    const treeGridX = Math.floor(x / 6);
    const treeCheck = hash(treeGridX * 43.12 + seed);
    const exactColumnCheck = hash(x * 12.3 + seed);
    
    if (treeCheck < biome.treeChance && (x % 6 === 2) && exactColumnCheck > 0.4) {
      hasTreeHere = true;
    }
  }

  for (let y = 0; y <= maxWorldHeight; y++) {
    if (y < surfaceY) {
      if (biome.name === "ocean" && y < biome.seaLevel) {
        tiles.push("water");
      } else {
        if (hasTreeHere && y >= surfaceY - 3 && y < surfaceY) {
          tiles.push("oak_log");
        } else {
          tiles.push("air");
        }
      }
    } 
    else if (y === surfaceY) {
      if (biome.name === "ocean" && y < biome.seaLevel) {
        tiles.push("water");
      } else {
        tiles.push(biome.surfaceBlock);
      }
    } 
    else if (y <= surfaceY + biome.subsurfaceDepth) {
      tiles.push(biome.subsurfaceBlock);
    } 
    else {
      if (isCave(x, y, seed) && y < maxWorldHeight - 5) {
        tiles.push("air");
      } else {
        const blockType = getUndergroundBlock(x, y, surfaceY, seed, biome.deepBlock);
        tiles.push(blockType);
      }
    }
  }

  return { x, biome: biome.name, surfaceY, tiles };
}