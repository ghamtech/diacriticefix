const Stripe = require('stripe');
const PdfService = require('../../backend/services/pdfService');
const { v4: uuidv4 } = require('uuid');

// Initialize Stripe with the secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
            const fileBuffer = Buffer.from(fileData, 'base64');
            const processedFile = await PdfService.processPdfFile(fileBuffer, userEmail, fileName);
            console.log('PDF processing completed', processedFile);
            
            // Save file temporarily
            const fileId = processedFile.fileId;
            const filePath = path.join(tmpDir, `${fileId}.pdf`);
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
                success_url: `${process.env.BASE_URL}/download.html?file_id=${fileId}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.BASE_URL}/?cancelled=true`,
                client_reference_id: fileId,
                customer_email: userEmail,
                metadata: {
                    fileId: fileId,
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
                    fileId: fileId,
                    sessionId: session.id,
                    paymentUrl: session.url
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