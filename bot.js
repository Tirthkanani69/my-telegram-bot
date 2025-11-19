const TelegramBot = require('node-telegram-bot-api');

// Bot token environment variable se lega
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// User goals store karne ke liye
let userGoals = {};

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Welcome! Use commands:
/setgoal [target] - Goal set karein
/status - Progress dekhein`);
});

// Goal set karne ka command
bot.onText(/\/setgoal (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const goal = match[1];
  userGoals[chatId] = goal;
  bot.sendMessage(chatId, `✅ Goal set: ${goal} followers`);
});

// Status check command
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const goal = userGoals[chatId] || 'No goal set';
  bot.sendMessage(chatId, `📊 Your goal: ${goal} followers`);
});

console.log('Bot started successfully!');