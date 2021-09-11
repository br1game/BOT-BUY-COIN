require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const ccxt = require("ccxt");

const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

const binanceClient = new ccxt.binance({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET,
});

const config = {
  status: false,
  coinToBuy: "BTC",
};

bot.on("message", async (msg) => {
  if (msg.chat.id != process.env.ADMIN_CHAT_ID) {
    return;
  }

  if (msg.text == "/start" && msg.chat.id == process.env.ADMIN_CHAT_ID) {
    config.status = true;
    bot.sendMessage(process.env.ADMIN_CHAT_ID, "BOT ĐÃ HOẠT ĐỘNG");
  }

  if (msg.text == "/stop" && msg.chat.id == process.env.ADMIN_CHAT_ID) {
    config.status = false;
    bot.sendMessage(process.env.ADMIN_CHAT_ID, "NGƯNG HOẠT ĐỘNG");
  }
  if (msg.text.includes("/set") && msg.chat.id == process.env.ADMIN_CHAT_ID) {
    let coinName = msg.text.replace("/set ", "");
    config.coinToBuy = coinName.toUpperCase();
    bot.sendMessage(
      process.env.ADMIN_CHAT_ID,
      `- Set coin: "${config.coinToBuy}"`
    );
  }
});

const removeZeroValueBalance = (balance) => {
  let newData = {};
  for (const property in balance) {
    if (balance[property] != 0) {
      newData[property] = balance[property];
    }
  }
  return newData;
};

const getBalance = async () => {
  let balanceResult = await binanceClient.fetchBalance({ recvWindow: 59000 });
  let balance = removeZeroValueBalance(balanceResult.total);
  return balance;
};

const isHaveUSD = async (balance) => {
  let { USDT, BUSD } = balance;
  if (USDT > 10 || BUSD > 10) {
    return true;
  }
  return false;
};

const run = async () => {
  if (config.status === false) return;
  let balance = await getBalance();
  // console.log(balance); for debug
  let condition = await isHaveUSD(balance);
  if (condition === true) {
    console.log("havae 10$");
    let pairUSDT = `${config.coinToBuy}/USDT`;
    let pairBUSD = `${config.coinToBuy}/BUSD`;
    let price;
    let data = await binanceClient.fetchTicker(pairUSDT);
    if (data) {
      price = Number(data.info.lastPrice);
    }
    try {
      await binanceClient.createMarketOrder(
        pairBUSD,
        "buy",
        Number(balance.BUSD / price),
      );
    } catch (error) {
      console.log(error.message);
    }

    try {
      await binanceClient.createMarketOrder(
        pairUSDT,
        "buy",
        Number(balance.USDT / price)
      );
    } catch (error) {
      console.log(error.message);
    }
    bot.sendMessage(
      process.env.ADMIN_CHAT_ID,
      `Buy: ${config.coinToBuy.toUpperCase()}`
    );
  }
};

setInterval(run, 3000);

const spamRunning = () => {
  bot.sendMessage(process.env.ADMIN_CHAT_ID, "BOT ĐÃ ĐƯỢC KẾT NỐI THÀNH CÔNG");
};
const time = 1000 * 1 * 60 * 60 * 12;

spamRunning();
setInterval(spamRunning, time);
