const TelegramBot = require('node-telegram-bot-api');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Database initialize
db.defaults({ users: {} }).write();

// Helper functions
function createProgressBar(current, total, length = 10) {
  const percentage = current / total;
  const filled = Math.round(length * percentage);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMsg = `🎯 *PREMIUM GOAL TRACKER*\n\n` +
    `*Available Commands:*\n` +
    `📊 /setgoal <platform> <target> - New goal set\n` +
    `🔄 /update <platform> <current> - Progress update\n` +
    `📈 /analytics - Detailed progress report\n` +
    `⏰ /remind <days> - Set auto reminders\n` +
    `🏆 /achievements - Your achievements\n` +
    `🆘 /help - Show this message\n\n` +
    `*Supported Platforms:* Instagram, YouTube, Twitter, Telegram, Custom`;
  
  bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// Set goal command
bot.onText(/\/setgoal (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const platform = match[1].toLowerCase();
  const target = parseInt(match[2]);
  
  if (!db.get(`users.${chatId}`).value()) {
    db.set(`users.${chatId}`, {}).write();
  }
  
  db.set(`users.${chatId}.${platform}`, {
    target: target,
    current: 0,
    startDate: new Date().toISOString(),
    achieved: false
  }).write();
  
  const response = `✅ *GOAL SET SUCCESSFULLY!*\n\n` +
    `📱 *Platform:* ${platform.toUpperCase()}\n` +
    `🎯 *Target:* ${formatNumber(target)} followers\n` +
    `📅 *Start Date:* ${new Date().toLocaleDateString()}\n\n` +
    `Use /update ${platform} <number> to update your progress!`;
  
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

// Update progress command
bot.onText(/\/update (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const platform = match[1].toLowerCase();
  const current = parseInt(match[2]);
  
  const userGoal = db.get(`users.${chatId}.${platform}`).value();
  
  if (!userGoal) {
    return bot.sendMessage(chatId, `❌ No goal found for ${platform}. Use /setgoal first.`);
  }
  
  const target = userGoal.target;
  const progressBar = createProgressBar(current, target);
  const remaining = target - current;
  
  db.set(`users.${chatId}.${platform}.current`, current).write();
  
  // Check if goal achieved
  if (current >= target && !userGoal.achieved) {
    db.set(`users.${chatId}.${platform}.achieved`, true).write();
    db.set(`users.${chatId}.${platform}.achievedDate`, new Date().toISOString()).write();
    
    const achievementMsg = `🎉 *GOAL ACHIEVED! CONGRATULATIONS!* 🎉\n\n` +
      `🏆 *Platform:* ${platform.toUpperCase()}\n` +
      `✅ *Target:* ${formatNumber(target)} followers\n` +
      `📊 *Reached:* ${formatNumber(current)} followers\n` +
      `🎯 *Progress:* ${progressBar}\n\n` +
      `*You're amazing! Set a new goal with /setgoal*`;
    
    bot.sendMessage(chatId, achievementMsg, { parse_mode: 'Markdown' });
  } else {
    const updateMsg = `📊 *PROGRESS UPDATE*\n\n` +
      `📱 *Platform:* ${platform.toUpperCase()}\n` +
      `🎯 *Target:* ${formatNumber(target)} followers\n` +
      `📈 *Current:* ${formatNumber(current)} followers\n` +
      `🎯 *Progress:* ${progressBar}\n` +
      `📋 *Remaining:* ${formatNumber(remaining)} followers\n\n` +
      `*Keep going! You're ${Math.round((current/target)*100)}% there!*`;
    
    bot.sendMessage(chatId, updateMsg, { parse_mode: 'Markdown' });
  }
});

// Analytics command
bot.onText(/\/analytics/, (msg) => {
  const chatId = msg.chat.id;
  const userData = db.get(`users.${chatId}`).value();
  
  if (!userData || Object.keys(userData).length === 0) {
    return bot.sendMessage(chatId, `📊 *No goals set yet!*\nUse /setgoal to start tracking your growth!`, { parse_mode: 'Markdown' });
  }
  
  let analyticsMsg = `📈 *YOUR ANALYTICS REPORT*\n\n`;
  
  Object.keys(userData).forEach(platform => {
    const goal = userData[platform];
    const progress = createProgressBar(goal.current, goal.target);
    const percentage = Math.round((goal.current / goal.target) * 100);
    
    analyticsMsg += `*${platform.toUpperCase()}*\n` +
      `🎯 ${formatNumber(goal.current)} / ${formatNumber(goal.target)}\n` +
      `📊 ${progress}\n` +
      `📅 Started: ${new Date(goal.startDate).toLocaleDateString()}\n` +
      `${goal.achieved ? '✅ ACHIEVED' : '🔄 IN PROGRESS'}\n\n`;
  });
  
  bot.sendMessage(chatId, analyticsMsg, { parse_mode: 'Markdown' });
});

// Achievements command
bot.onText(/\/achievements/, (msg) => {
  const chatId = msg.chat.id;
  const userData = db.get(`users.${chatId}`).value();
  
  if (!userData) {
    return bot.sendMessage(chatId, `🏆 *No achievements yet!*\nSet and achieve goals to unlock achievements!`, { parse_mode: 'Markdown' });
  }
  
  const achievedGoals = Object.keys(userData).filter(platform => userData[platform].achieved);
  
  let achievementsMsg = `🏆 *YOUR ACHIEVEMENTS*\n\n`;
  
  if (achievedGoals.length === 0) {
    achievementsMsg += `*No achievements unlocked yet!*\nKeep working on your goals! 💪`;
  } else {
    achievedGoals.forEach(platform => {
      const goal = userData[platform];
      achievementsMsg += `✅ *${platform.toUpperCase()}*\n` +
        `🎯 ${formatNumber(goal.target)} followers\n` +
        `📅 Achieved: ${new Date(goal.achievedDate).toLocaleDateString()}\n\n`;
    });
  }
  
  bot.sendMessage(chatId, achievementsMsg, { parse_mode: 'Markdown' });
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Need help? Contact support or check /start for commands!`);
});

console.log('🚀 Premium Goal Tracker Bot Started!');