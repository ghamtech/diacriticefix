const Stripe = require('stripe');
const PdfService = require('../../backend/services/pdfService');
const PaymentService = require('../../backend/services/paymentService');
const { v4: uuidv4 } = require('uuid');

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

// Create temporary directory if it doesn't exist
const path = require('path');
const fs = require('fs');
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
    
    if (!fileData || !fileName || !userEmail) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          fileData: !!fileData,
          fileName: !!fileName,
          userEmail: !!userEmail
        }) 
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
      fs.writeFileSync(filePath, processedFile.processedText);
      
      // Generate download link
      const downloadLink = PaymentService.generateDownloadLink(
        processedFile.fileId,
        userEmail,
        'manual_' + uuidv4()
      );
      
      console.log('Processing completed successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          fileId: processedFile.fileId,
          downloadLink: downloadLink
        })
      };
      
    } catch (processingError) {
      console.error('Error during file processing:', processingError);
      console.error('Error details:', {
        message: processingError.message,
        stack: processingError.stack,
        response: processingError.response?.data,
        config: processingError.config?.url
      });
      
      return {
        statusCode: 200, // Still return 200 so the frontend can proceed
        headers,
        body: JSON.stringify({
          success: true, // Allow the process to continue
          fileId: uuidv4(),
          downloadLink: `${process.env.BASE_URL}/download.html?error=processing_failed&message=${encodeURIComponent(processingError.message)}`,
          error: processingError.message,
          isFallback: true
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
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};