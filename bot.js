require('dotenv').config(); 

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// --- Configuration ---

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL_USERNAME;
const CMC_API_KEY = process.env.CMC_API_KEY;

// How often to check for new tokens (in milliseconds)
const CHECK_INTERVAL = 5 * 60 * 1000; // every 6 minutes

// 🚀 Initialize Telegram Bot
// =====================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Store last seen token ID (in memory)
let lastSentTokenId = null;
let fullAlertSent = new Set(); // Track tokens that have received full alert

// =====================
// 📡 Fetch Recently Added Tokens from CMC
// =====================
async function getRecentlyAddedCryptos() {
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            params: {
                start: 1,
                limit: 1, // only fetch the latest
                sort: 'date_added',
                sort_dir: 'desc',
                convert: 'USD'
            },
            headers: {
                'X-CMC_PRO_API_KEY': CMC_API_KEY
            }
        });

        return response.data.data;
    } catch (error) {
        console.error('❌ Failed to fetch from CMC:', error.message);
        return null;
    }
}

// 🧾 Format Single Token Message
// =====================
function formatSingleCryptoMessage(crypto, fullAlert = true) {
    const name = crypto.name;
    const symbol = crypto.symbol;
    const price = crypto.quote?.USD?.price ? `$${parseFloat(crypto.quote.USD.price).toFixed(6)}` : 'N/A';
    const volume24h = crypto.quote?.USD?.volume_24h ? `$${parseInt(crypto.quote.USD.volume_24h).toLocaleString()}` : 'N/A';
    const platform = crypto.platform?.name || 'Own Blockchain';
    const tokenAddress = crypto.platform?.token_address || crypto.contract_address || null;
    const timeAddedUTC = crypto.date_added
        ? new Date(crypto.date_added).toUTCString().split(' ')[4] + ' UTC'
        : 'Unknown';

    const emoji = fullAlert ? '🟢' : '🟡'; // green for full, yellow for early

    const header = `${emoji} \\[${symbol}\] ${name}\n\n`;

    let message = `🚨 *New Token Listed on CMC* 🚨\n\n` + header +
                  `📛 *Coin Name:*   ${name}\n` +
                  `📈 *Price:*              ${price}\n` +
                  `💸 *Volume:*         ${volume24h}\n`;

    if (fullAlert && tokenAddress) {
        message += `🔗 *Address:* \n\`${tokenAddress}\`\n`;
    }

    message += `\n`; // spacing

    if (fullAlert) {
        message += `🌐 *Platform:*    ${platform}\n`;
    }

    message += `🕒 *Time:*           ${timeAddedUTC}\n\n`;

    message += `_Insider info received for possible CMC listing. Coin not listed anywhere yet (listing in 15 minutes approx). Buy now to be first (first pump)._ \n`;
   
    message += `\n Increase your chance of growth and listing on CoinMarketCap by 99% with ads on the alert channel (insider info)`;

    message += `\n\n📣 Ads, sponsored post, listings and updates available!`;
    
    return message;
}

// =====================
// 📣 Check for New Token + Send Alert
// =====================
async function checkForNewToken() {
    const cryptos = await getRecentlyAddedCryptos();

    if (!cryptos || cryptos.length === 0) {
        console.log(`[${new Date().toISOString()}] No tokens fetched.`);
        return;
    }

    const latestToken = cryptos[0];

    if (latestToken.id !== lastSentTokenId) {
        lastSentTokenId = latestToken.id;

        const hasAddress = !!(latestToken.platform?.token_address || latestToken.contract_address);
        const hasPlatform = !!latestToken.platform?.name;
        const hasFullInfo = hasAddress && hasPlatform;

        if (hasFullInfo) {
            // ✅ Full info already available – send full alert
            const fullMsg = formatSingleCryptoMessage(latestToken, true);
            await bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, fullMsg, { parse_mode: 'Markdown' });
            console.log(`[${new Date().toISOString()}] 🟢 Sent FULL alert for: ${latestToken.name}`);
        } else {
            // ⚠️ Partial info – send half alert first
            const halfMsg = formatSingleCryptoMessage(latestToken, false);
            await bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, halfMsg, { parse_mode: 'Markdown' });
            console.log(`[${new Date().toISOString()}] 🟡 Sent HALF alert for: ${latestToken.name}`);

            // 🔁 Check again after 2 minutes
            setTimeout(async () => {
                const updatedCryptos = await getRecentlyAddedCryptos();
                const updatedToken = updatedCryptos[0];

                const stillSameToken = updatedToken?.id === latestToken.id;
                const updatedHasAddress = !!(updatedToken.platform?.token_address || updatedToken.contract_address);
                const updatedHasPlatform = !!updatedToken.platform?.name;
                const hasFullInfoNow = updatedHasAddress && updatedHasPlatform;

                if (stillSameToken && hasFullInfoNow) {
                    const fullMsg = formatSingleCryptoMessage(updatedToken, true);
                    await bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, fullMsg, { parse_mode: 'Markdown' });
                    console.log(`[${new Date().toISOString()}] 🟢 Sent FULL alert for: ${updatedToken.name}`);
                } else {
                    console.log(`[${new Date().toISOString()}] 🔁 No full alert needed or token changed.`);
                }
            }, 4 * 60 * 1000); // 4 minutes
        }
    } else {
        console.log(`[${new Date().toISOString()}] No new token. Latest already sent.`);
    }
}


// 🕰️ Schedule Checker
// =====================
checkForNewToken(); // Run immediately on startup
setInterval(checkForNewToken, CHECK_INTERVAL);

const http = require("http");

const PORT = process.env.PORT || 3000;

// Dummy server to keep Render happy
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running");
}).listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
});
