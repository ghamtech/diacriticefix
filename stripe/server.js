// This is your live secret API key.
const stripe = require('stripe')('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');
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