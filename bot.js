const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'microsoft@gmail.com',
  auth: 'microsoft'
});

bot.loadPlugin(pathfinder);

const RANGE_GOAL = 3;
const MAX_BLOCK_DISTANCE = 30;

let state = "IDLE";
let droppedLog = null;


function itemIdToName(itemId) {
  const item = bot.registry.itemsById[itemId];
  return item ? item.name : null;
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function findNearestBlock(blockName) {
  state = "FINDING_BLOCK";

  return bot.findBlock({
    matching: block => block.name === blockName,
    maxDistance: MAX_BLOCK_DISTANCE
  });
}


async function moveToBlock(block) {
  state = "MOVING_TO_BLOCK";

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
  state = "MINING_BLOCK";

  console.log(`Found ${block.name}:`, block.position);

  try {
    await bot.lookAt(block.position, true);
    await bot.dig(block);

    console.log('Mined:', block.position);
  } catch (err) {
    console.log('Dig error:', err.message);
  }
}


function getLogItems() {
  const items = bot.inventory.items();

  return items
    .filter(item => item.name.includes('log'))
    .reduce((total, item) => total + item.count, 0);
}


function checkLogGoal() {
  const logCount = getLogItems();

  console.log(`Current log count: ${logCount}`);

  if (logCount >= 32) {
    console.log('Log count reached 32, stopping bot.');
    return true;
  }

  return false;
}


async function pickupItem(itemEntity) {
  state = "PICKING_UP_ITEM";

  if (!itemEntity || !itemEntity.isValid) {
    console.log('Dropped item no longer exists.');
    return;
  }

  const droppedItem = itemEntity.getDroppedItem();

  if (!droppedItem) {
    return;
  }

  if (!droppedItem.name.includes('log')) {
    return;
  }

  console.log(`Found dropped ${droppedItem.name}`);

  try {
    await bot.pathfinder.goto(
      new goals.GoalNear(
        itemEntity.position.x,
        itemEntity.position.y,
        itemEntity.position.z,
        1
      )
    );

    console.log(`Reached dropped ${droppedItem.name}`);
  } catch (err) {
    console.log('Pickup pathfinding error:', err.message);
  }
}


bot.on('itemDrop', (entity) => {
  const droppedItem = entity.getDroppedItem();

  if (!droppedItem) {
    return;
  }

  if (droppedItem.name.includes('log')) {
    console.log(`Dropped log detected: ${droppedItem.name}`);

    droppedLog = entity;
  }
});


async function main() {
  const defaultMove = new Movements(bot);

  bot.pathfinder.setMovements(defaultMove);

  bot.on('entityCollect', (collector, collected) => {
    console.log('Entity collected:', collected);
  });

  while (true) {

    if (checkLogGoal()) {
      return;
    }

    if (droppedLog) {
      await pickupItem(droppedLog);

      droppedLog = null;

      continue;
    }

    const block = findNearestBlock('birch_log');

    if (!block) {
      console.log('No birch logs nearby.');
      return;
    }

    await moveToBlock(block);

    await mineBlock(block);

    await sleep(750);
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