require('dotenv').config();
const fs = require('fs');
const path = require('path');

const express = require('express');
const axios = require('axios');
const refreshTokenFunc = require("./tokenRefresher");
const router = express.Router();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

router.get((req, res, next) => {
    if (req.parameters.sxsrf !== process.env.X_AUTH_TOKEN) {
        return res.status(401).json();
    }
    next();
})

router.get('/', async (req, res) => {
    try {
        const response = await axios.post('https://allegro.pl/auth/oauth/device', null, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
                client_id: clientId
            }
        });

        const deviceCode = response.data.device_code;
        const intervalId = setInterval(async () => {
            try {
                const response = await axios.post(`https://allegro.pl/auth/oauth/token?grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=${deviceCode}`, null, {
                    headers: {
                        'Authorization': `Basic ${auth}`
                    }
                });

                if (response.status === 200) {
                    console.log('Successfully authenticated with Allegro.');
                    try {
                        const accountDetails = await axios.get('https://api.allegro.pl/me', {
                            headers: {
                                'Authorization': `Bearer ${response.data.access_token}`,
                                'Accept': 'application/vnd.allegro.public.v1+json'
                            },
                        });
                        response.data.id = accountDetails.data.id;
                    } catch (error) {
                        console.log('Error in getting account details:', error.response.data.error);
                        clearInterval(intervalId);
                        return;
                    }


                    let data = fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8');
                    data = JSON.parse(data);
                    const index = data.findIndex(account => account.id === response.data.id);

                    if (index !== -1) {
                        data[index] = response.data;
                    } else {
                        data.push(response.data);
                    }
                    fs.writeFileSync(path.join(__dirname, '../data.json'), JSON.stringify(data, null, 2));
                    clearInterval(intervalId);
                }
            } catch (error) {
                if (error.response && error.response.status === 400 && error.response.data.error !== 'authorization_pending') {
                    console.log('Error in allegro auth:', error.response.data.error);
                    clearInterval(intervalId);
                }
            }
        }, 5500);

        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({'error': 'An error occurred while trying to authenticate with Allegro.'});
    }
});

router.get('/refresh', async (req, res) => {
    try {
        await refreshTokenFunc();
        res.status(204).json();
    } catch (error) {
        console.error(error);
        res.status(500).json();
    }
});

module.exports = router;