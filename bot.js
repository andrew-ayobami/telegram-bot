require('dotenv').config();

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// --- Configuration ---

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL_USERNAME;
const CMC_API_KEY = process.env.CMC_API_KEY;


// How often to check for new tokens (in milliseconds)
const CHECK_INTERVAL = 10 * 60 * 1000; // every 10 minutes

// 🚀 Initialize Telegram Bot
// =====================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Store last seen token ID (in memory)
let lastSentTokenId = null;

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
function formatSingleCryptoMessage(crypto) {
    const name = crypto.name;
    const symbol = crypto.symbol;
    const price = crypto.quote?.USD?.price ? `$${parseFloat(crypto.quote.USD.price).toFixed(6)}` : 'N/A';
    const volume24h = crypto.quote?.USD?.volume_24h ? `$${parseInt(crypto.quote.USD.volume_24h).toLocaleString()}` : 'N/A';
    const platform = crypto.platform?.name || 'Unknown';
    const tokenAddress = crypto.platform?.token_address || null;

    const timeAddedUTC = crypto.date_added
        ? new Date(crypto.date_added).toUTCString().split(' ')[4] + ' UTC'
        : 'Unknown';

    const header = `🔴 \\[${symbol}\] ${name}\n\n`;

    let message = `🚨 *New Token Listed on CMC* 🚨\n\n` + header +
                  `📛 Coin Name:  ${name}\n` +
                  `📈 Price:  ${price}\n` +
                  `💸 Volume (24h):  ${volume24h}\n`;

    if (tokenAddress) {
        message += `🔗 Address:\n\`${tokenAddress}\`\n`;
    }

    message += `\n`; // Add space for readability

    message += `🌐 Platform:  ${platform}\n` +
               `🕒 Time:  ${timeAddedUTC}`;

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

        const message = formatSingleCryptoMessage(latestToken);

        try {
            await bot.sendMessage(TELEGRAM_CHANNEL_USERNAME, message, { parse_mode: 'Markdown' });
            console.log(`[${new Date().toISOString()}] ✅ Sent alert for: ${latestToken.name}`);
        } catch (error) {
            console.error('❌ Failed to send Telegram message:', error.message);
        }
    } else {
        console.log(`[${new Date().toISOString()}] No new token. Latest already sent.`);
    }
}


// 🕰️ Schedule Checker
// =====================
checkForNewToken(); // Run immediately on startup
setInterval(checkForNewToken, CHECK_INTERVAL);