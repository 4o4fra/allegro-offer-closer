const router = require('express').Router();
const fs = require('fs');
const axios = require('axios');
const path = require("node:path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));

router.get('/', async (req, res) => {
    const externalId = req.query.externalId;
    const results = [];

    for (let account of data) {
        const bearerToken = account.access_token;

        try {
            const response = await axios.get('https://api.allegro.pl/sale/offers', {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`,
                    'Accept': 'application/vnd.allegro.public.v1+json'
                },
                params: {
                    'external.id': externalId,
                    'publication.status': 'ACTIVE'
                }
            });

            results.push({
                accountId: account.id,
                data: response.data
            });
        } catch (error) {
            console.error(error);
            results.push({
                accountId: account.id,
                error: 'An error occurred while trying to fetch products.'
            });
        }
    }

    res.json(results);
});

module.exports = router;