const fs = require('fs');
const path = require('path');
const axios = require('axios');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');


const refreshTokenFunc = async () => {
    for (let account of data) {
        const refreshToken = account.refresh_token;
        try {
            const response = await axios.post('https://allegro.pl/auth/oauth/token', null, {
                headers: {
                    'Authorization': `Basic ${auth}`
                },
                params: {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                }
            });
            account.access_token = response.data.access_token;
            account.refresh_token = response.data.refresh_token;
            console.log(`Token refreshed successfully for account ${account.id}.`);
        } catch (error) {
            console.error(`Failed to refresh token for account ${account.id}: ${error.response.data}`);
            return;
        }
    }
    fs.writeFileSync(path.join(__dirname, '../data.json'), JSON.stringify(data, null, 2));
};

refreshTokenFunc().then(() => console.log('Token after-start refreshment process has been started.'));
setInterval(refreshTokenFunc, 5 * 60 * 60 * 1000);

module.exports = refreshTokenFunc;