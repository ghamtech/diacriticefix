const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

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
    
    // Parse body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Invalid request body format' }) 
      };
    }
    
    const { sessionId } = body;
    
    if (!sessionId) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Session ID is required' }) 
      };
    }
    
    console.log('Verifying payment session:', sessionId);
    
    try {
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        console.log('Payment not completed:', session.payment_status);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Payment not completed' })
        };
      }
      
      // Get file ID from client reference ID
      const fileId = session.client_reference_id;
      
      if (!fileId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File ID not found in session' })
        };
      }
      
      // Get file path from temporary directory
      const path = require('path');
      const fs = require('fs');
      const tmpDir = '/tmp/processed-files';
      const filePath = path.join(tmpDir, `${fileId}.pdf`);
      
      if (!fs.existsSync(filePath)) {
        console.log('File not found:', filePath);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File not found' })
        };
      }
      
      // Read file content
      const fileContent = fs.readFileSync(filePath);
      
      // Return success status with file content
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${session.metadata.fileName.replace('.pdf', '_reparat.pdf')}"`
        },
        body: fileContent.toString('base64'),
        isBase64Encoded: true
      };
      
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to verify payment',
          details: stripeError.message
        })
      };
    }
    
  } catch (error) {
    console.error('Critical error in verify-payment function:', error);
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