const PdfService = require('../../backend/services/pdfService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
            // Convert base64 to buffer
            const fileBuffer = Buffer.from(fileData, 'base64');
            console.log('File buffer created, size:', fileBuffer.length);
            
            // Process PDF
            const processedFile = await PdfService.processPdfFile(fileBuffer, userEmail, fileName);
            console.log('PDF processing completed', processedFile);
            
            // Even if there was an error during processing, continue with payment
            // so the user can contact support if needed
            
            // For testing purposes, create a simple payment session
            let sessionId = 'test_session_' + Date.now();
            let paymentUrl = `${process.env.BASE_URL}/download.html?file_id=${processedFile.fileId}&session_id=${sessionId}&test_mode=true`;
            
            // If Stripe is configured, use real payment
            if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
                try {
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
                        success_url: `${process.env.BASE_URL}/download.html?file_id=${processedFile.fileId}&session_id={CHECKOUT_SESSION_ID}`,
                        cancel_url: `${process.env.BASE_URL}/?cancelled=true`,
                        client_reference_id: processedFile.fileId,
                        customer_email: userEmail,
                        metadata: {
                            fileId: processedFile.fileId,
                            fileName: fileName,
                            userEmail: userEmail
                        }
                    });
                    
                    sessionId = session.id;
                    paymentUrl = session.url;
                    
                    console.log('Stripe session created successfully');
                } catch (stripeError) {
                    console.error('Stripe error, falling back to test mode:', stripeError);
                    // Continue with test mode if Stripe fails
                }
            }
            
            console.log('Processing completed successfully');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    fileId: processedFile.fileId,
                    sessionId: sessionId,
                    paymentUrl: paymentUrl,
                    isFallback: processedFile.isFallback,
                    hasError: !!processedFile.error,
                    testMode: !process.env.STRIPE_SECRET_KEY
                })
            };
            
        } catch (processingError) {
            console.error('Error during file processing:', processingError);
            return {
                statusCode: 200, // Still return 200 so the frontend can proceed
                headers,
                body: JSON.stringify({
                    success: true, // Allow the process to continue
                    fileId: uuidv4(),
                    sessionId: 'error_session_' + Date.now(),
                    paymentUrl: `${process.env.BASE_URL}/download.html?error=processing_failed&message=${encodeURIComponent(processingError.message)}`,
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

// Simple UUID generator for fallback
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}