const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'YOUR_MICROSOFT_EMAIL',
  auth: 'microsoft'
});

bot.loadPlugin(pathfinder);

const RANGE_GOAL = 3;
const MAX_BLOCK_DISTANCE = 30;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findNearestBlock(blockName) {
  return bot.findBlock({
    matching: block => block.name === blockName,
    maxDistance: MAX_BLOCK_DISTANCE
  });
}

async function moveToBlock(block) {
  const goal = new goals.GoalNear(
    block.position.x,
    block.position.y,
    block.position.z,
    RANGE_GOAL
  );

  try {
    await bot.pathfinder.goto(goal);
  } catch (err) {
    console.log('Pathfinding error:', err.message);
  }
}

async function mineBlock(block) {
  console.log(`Found ${block.name}:`, block.position);

  try {
    await bot.lookAt(block.position, true);
    await bot.dig(block);

    console.log('Mined:', block.position);
  } catch (err) {
    console.log('Dig error:', err.message);
  }
}

async function main() {
  const defaultMove = new Movements(bot);
  bot.pathfinder.setMovements(defaultMove);

  while (true) {
    const block = findNearestBlock('birch_log');

    if (!block) {
      console.log('No birch logs nearby.');
      return;
    }

    await moveToBlock(block);
    await mineBlock(block);

    await sleep(500);
  }
}

bot.once('spawn', async () => {
  console.log('Bot spawned!');

  await sleep(3000);
  await main();
});

bot.on('error', err => {
  console.log('ERROR:', err);
});

bot.on('kicked', reason => {
  console.log('KICKED:', reason);
});

bot.on('end', reason => {
  console.log('DISCONNECTED:', reason);
});