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
    
    const { fileData, fileName } = body;
    
    if (!fileData || !fileName) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          fileData: !!fileData,
          fileName: !!fileName
        }) 
      };
    }
    
    console.log(`Processing file: ${fileName}`);
    
    try {
      // Process PDF file
      const pdfService = new PdfService();
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      console.log('File buffer created, size:', fileBuffer.length);
      
      // Check file size (10MB limit)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit. Please use a smaller PDF file.');
      }
      
      const processedFile = await pdfService.processPdfFile(fileBuffer, fileName);
      console.log('PDF processing completed', processedFile);
      
      // Save file temporarily
      const filePath = path.join(tmpDir, `${processedFile.fileId}.txt`);
      fs.writeFileSync(filePath, processedFile.processedPdf);
      
      // Return success with file ID for download after payment
      console.log('File processing completed successfully');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          fileId: processedFile.fileId
        })
      };
      
    } catch (processingError) {
      console.error('Error during file processing:', processingError);
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