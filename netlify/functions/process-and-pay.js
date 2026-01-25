const Stripe = require('stripe');
const PdfService = require('../../backend/services/pdfService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

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
    
    const { fileData, fileName, userEmail } = body;
    
    // Validate required parameters
    if (!fileData) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Missing file data' }) 
      };
    }
    
    if (!fileName) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Missing filename' }) 
      };
    }
    
    if (!userEmail) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Missing email address' }) 
      };
    }
    
    console.log(`Processing file: ${fileName} for user: ${userEmail}`);
    
    try {
      // Process PDF file
      const pdfService = new PdfService();
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      console.log('File buffer created, size:', fileBuffer.length);
      
      const processedFile = await pdfService.processPdfFile(fileBuffer, userEmail, fileName);
      console.log('PDF processing completed', processedFile);
      
      // Save file temporarily
      const filePath = path.join(tmpDir, `${processedFile.fileId}.txt`);
      fs.writeFileSync(filePath, processedFile.processedPdf);
      
      // Create Stripe payment session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'PDF cu diacritice reparate',
              description: fileName
            },
            unit_amount: 199, // 1.99€ in cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        // Where to send the user after payment
        success_url: `${process.env.BASE_URL}/download.html?file_id=${processedFile.fileId}&session_id={CHECKOUT_SESSION_ID}`,
        // Where to send the user if they cancel
        cancel_url: `${process.env.BASE_URL}/?cancelled=true`,
        // Our special ID to connect payment to file
        client_reference_id: processedFile.fileId,
        customer_email: userEmail,
        metadata: {
          fileId: processedFile.fileId,
          fileName: fileName,
          userEmail: userEmail
        }
      });
      
      console.log('Stripe session created successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          fileId: processedFile.fileId,
          sessionId: session.id,
          paymentUrl: session.url
        })
      };
      
    } catch (processingError) {
      console.error('Error during file processing:', processingError);
      
      // Return detailed error for frontend
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to process PDF file',
          details: processingError.message
        })
      };
    }
    
  } catch (error) {
    console.error('Critical error in process-and-pay function:', error);
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