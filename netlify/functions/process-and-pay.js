// This is like our checkout counter at a store
// It takes your PDF, fixes it, and then takes your payment

// We need these special tools
const Stripe = require('stripe');
const PdfService = require('../../backend/services/pdfService');
const { v4: uuidv4 } = require('uuid');

// This is our secret key for the payment machine (Stripe)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'  // This tells Stripe which version to use
});

// Where we keep fixed files temporarily
const path = require('path');
const fs = require('fs');
const tmpDir = '/tmp/processed-files';

// Make sure our temporary folder exists
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// This is the main function that runs when someone wants to fix a PDF
exports.handler = async (event, context) => {
  try {
    // These special instructions help our website talk safely with other websites
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // Handle special browser checks
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // Make sure only POST requests are allowed (like only accepting payment at checkout)
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers,
        body: JSON.stringify({ error: 'This only works with POST requests' }) 
      };
    }
    
    // Get the request data from the browser
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      console.error('Problem reading request:', error);
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Could not understand your request' }) 
      };
    }
    
    // Get the important parts from the request
    const { fileData, fileName } = body;
    
    // Make sure we have everything we need
    if (!fileData || !fileName) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ 
          error: 'Missing information - need file and filename',
          fileData: !!fileData,
          fileName: !!fileName
        }) 
      };
    }
    
    console.log(`Fixing file: ${fileName}`);
    
    try {
      // Create our PDF fixing toolbox
      const pdfService = new PdfService();
      
      // Convert the file data from base64 format to a real file
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      console.log('File is ready to fix, size:', fileBuffer.length);
      
      // Fix the PDF file!
      const processedFile = await pdfService.processPdfFile(fileBuffer, fileName);
      console.log('PDF fixed successfully', processedFile);
      
      // Save the fixed file temporarily
      const filePath = path.join(tmpDir, `${processedFile.fileId}.txt`);
      fs.writeFileSync(filePath, processedFile.processedPdf);
      
      // Create a payment session with Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'PDF with fixed diacritics',
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
        cancel_url: `${process.env.BASE_URL}/`,
        // Our special ID to connect payment to file
        client_reference_id: processedFile.fileId,
        metadata: {
          fileId: processedFile.fileId,
          fileName: fileName
        }
      });
      
      console.log('Payment session created successfully');
      
      // Send back success response with payment information
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
      console.error('Problem fixing PDF:', processingError);
      // Even if fixing fails, we still want to let the user pay and get an error message
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
    console.error('Big problem in our checkout:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Server problem',
        message: error.message
      })
    };
  }
};