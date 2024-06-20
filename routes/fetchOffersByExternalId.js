const router = require('express').Router();
const fs = require('fs');
const axios = require('axios');
const path = require("node:path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));

async function getOffers(data, shippingRatesId) {
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
                    'sort': 'stock.available',
                    'delivery.shippingRates.id': shippingRatesId,
                    'publication.status': 'ACTIVE',
                    'sellingMode.format': 'BUY_NOW',
                    'limit': 50
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
    return results;
}

async function getOfferWithCertainStock(stockCount, shippingRatesId) {
    const results = await getOffers(data, shippingRatesId);
    let filteredOffers = [];
    results.forEach(result => {
        result.data.offers.forEach(offer => {
            if (offer.stock.available === Number(stockCount)) {
                filteredOffers.push(offer);
            }
        });
    });
    return filteredOffers;
}

router.get('/', async (req, res) => {
    const shippingRatesId = req.query.shippingRatesId ?? null;
    const results = await getOffers(data, shippingRatesId);
    res.json(results);
});

router.get('/:stockCount', async (req, res) => {
    const offers = await getOfferWithCertainStock(req.params.stockCount, req.query.shippingRatesId);
    res.status(200).json(offers);
});

module.exports = router;