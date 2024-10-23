import express from 'express'
import { contactQueue } from './queues/contactQueue.mjs';
import { tagsQueue } from './queues/tagsQueue.mjs';
import { importQueue } from './queues/importQueue.mjs';
const router = express.Router()

//WEBHOOK CUSTOMER CREATED AND UPDATED
router.post('/wehbooks/customer', (req, res) => {
    const customer = req.body;
    contactQueue.add(customer);

    res.send("Webhook received");
})

//WEBHOOK CUSTOMER TAG CREATED
router.post('/webhooks/tags/add', (req, res) => {
    const { customerId, tags } = req.body;
    tagsQueue.add({ customerId, tags, type: 'add' });

    res.send("Webhook received");
})

//WEBHOOK CUSTOMER TAG REMOVED
router.post('/webhooks/tags/remove', (req, res) => {
    const { customerId, tags } = req.body;
    tagsQueue.add({ customerId, tags, type: 'remove' });

    res.send("Webhook received");
})

//WEBHOOK APP INSTALLED
router.post('/webhooks/app/installed', (req, res) => {
    const { shop, access_token } = req.query;
    importQueue.add({ shop, token: access_token });

    console.log(`App installed for shop ${shop}`);
    res.send("Webhook received");
})

//HEALTH CHECK
router.get('/health', (req, res) => {
    res.status(200).send('OK')
})


export default router
