require('dotenv').config();
const stripe = require('stripe')('pk_live_51SbKtIRvhJNCyR7MHEJZnVmJW1kgGTc6KysHLY45PzkLBTv6FrhomUbuyiN3mZbIOKOW3YlS8ksDeYqkIZR25Pyq006CJY9pzw');
const express = require('express');
const app = express();
app.use(express.static('public'));

const YOUR_DOMAIN = 'http://diacriticefix.ro';

app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price: 'price_1Sn5292Kaq5ZwvbmefE8JbVA',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}/success.html`,
    automatic_tax: {enabled: true},
  });

  res.redirect(303, session.url);
});

app.listen(4242, () => console.log('Running on port 4242'));