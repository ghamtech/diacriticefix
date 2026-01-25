const Stripe = require('stripe');
const PdfService = require('../../backend/services/pdfService');
const { v4: uuidv4 } = require('uuid');
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
          
          // Get file ID from client reference ID
          const fileId = session.client_reference_id;
          const fileName = session.metadata?.fileName || 'document_reparat.pdf';
          const userEmail = session.customer_email;
          
          console.log(`Payment completed for file: ${fileId}`);
          
          // In a real implementation, you would:
          // 1. Mark the payment as completed in your database
          // 2. Send a success notification to the user
          // 3. Prepare the file for download
          
          // For this implementation, we just log the completion
          console.log('Payment processed successfully for file:', fileId);
          
          break;
        
        // Add other event types you want to handle:
        // case 'payment_intent.succeeded':
        // case 'charge.refunded':
        // etc.
        
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