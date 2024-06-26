const router = require('express').Router();
const fs = require('fs');
const axios = require('axios');
const path = require("node:path");

let data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
const shippingRatesIds = JSON.parse(fs.readFileSync(path.join(__dirname, '../shippingRatesIds.json'), 'utf8'));

fs.watch(path.join(__dirname, '../data.json'), (eventType) => {
    if (eventType === 'change') {
        data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
        console.log('data.json has been updated, data refreshed.');
    }
});

async function getOffers(data) {
    const results = [];
    for (let account of data) {
        const bearerToken = account.access_token;
        const shippingRatesId = shippingRatesIds[account.id] ?? '';
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
            console.error(error.response.data);
            results.push({
                accountId: account.id,
                error: 'An error occurred while trying to fetch products.',
                offers: []
            });
        }
    }
    return results;
}

async function getOffersWithCertainStock(stockCount) {
    const results = await getOffers(data);
    let filteredOffers = [];
    results.forEach((result, index) => {
        result.data.offers.forEach(offer => {
            if (offer.stock.available === Number(stockCount)) {
                filteredOffers.push({
                    id: offer.id,
                    accountId: index
                });
            }
        });
    });
    return filteredOffers;
}

router.get('/', async (req, res) => {
    const results = await getOffers(data);
    res.json(results);
});

router.get('/:stockCount', async (req, res) => {
    const offers = await getOffersWithCertainStock(req.params.stockCount);
    res.status(200).json(offers);
});

setInterval(async () => {
    const offers = await getOffersWithCertainStock(config.stockCount);
    for (let offer of offers) {
        try {
            const response = await axios.patch(`https://api.allegro.pl/sale/product-offers/${offer.id}`, {
                'stock': {
                    'available': 0
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${data[offer.accountId].access_token}`,
                    'Accept': 'application/vnd.allegro.public.v1+json',
                    'Content-Type': 'application/vnd.allegro.public.v1+json'
                }
            });
            console.log(`Offer ${offer.id} ended successfully. Response code: ${response.status}.`);
        } catch (error) {
            console.error(`An error occurred while trying to remove offer ${offer.id}.`, error.response.data);
        }
    }
}, 10000);

module.exports = router;