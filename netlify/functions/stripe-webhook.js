const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

// Create temporary directory if it doesn't exist
const tmpDir = '/tmp/processed-files';
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

exports.handler = async (event, context) => {
  try {
    // Enable CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' }) 
      };
    }
    
    // Get the Stripe signature header
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      console.error('Missing Stripe signature header');
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Missing Stripe signature' }) 
      };
    }
    
    let eventObj;
    
    try {
      // Construct the event using the webhook secret
      eventObj = stripe.webhooks.constructEvent(
        event.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      console.log('Webhook verified successfully', eventObj.type);
      
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
      };
    }
    
    // Handle the event
    try {
      switch (eventObj.type) {
        case 'checkout.session.completed':
          const session = eventObj.data.object;
          
          // Get file ID from client reference ID or metadata
          const fileId = session.client_reference_id || session.metadata.fileId;
          const fileName = session.metadata?.fileName || 'document_reparat.pdf';
          
          if (!fileId) {
            console.error('Missing file ID in webhook event');
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Missing file ID' })
            };
          }
          
          console.log(`Payment completed for file: ${fileId}`);
          
          // Verify the file exists
          const filePath = path.join(tmpDir, `${fileId}.txt`);
          if (!fs.existsSync(filePath)) {
            console.error('File not found for download:', filePath);
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'File not found for download' })
            };
          }
          
          // Log successful payment processing
          console.log(`Payment processed successfully for file: ${fileId}`);
          
          break;
        
        default:
          console.log(`Unhandled event type: ${eventObj.type}`);
      }
      
      // Return a 200 response to acknowledge receipt of the event
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true })
      };
      
    } catch (error) {
      console.error('Error processing webhook event:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Error processing webhook event',
          details: error.message
        })
      };
    }
    
  } catch (error) {
    console.error('Critical error in webhook function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Server error',
        message: error.message
      })
    };
  }
};