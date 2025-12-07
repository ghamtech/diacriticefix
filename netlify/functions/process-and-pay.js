const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PdfService = require('../../backend/services/pdfService');
const fs = require('fs');
const path = require('path');

// Create temporary directory if it doesn't exist
const tmpDir = '/tmp/processed-files';
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
}

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { 
                statusCode: 405, 
                body: JSON.stringify({ error: 'Method Not Allowed' }) 
            };
        }
        
        const { fileData, fileName, userEmail } = JSON.parse(event.body);
        
        if (!fileData || !fileName || !userEmail) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Missing required parameters' }) 
            };
        }
        
        console.log('Processing file:', fileName);
        
        // Process PDF file
        const fileBuffer = Buffer.from(fileData, 'base64');
        const processedFile = await PdfService.processPdfFile(fileBuffer, userEmail, fileName);
        
        console.log('File processed successfully, creating payment session...');
        
        // Save file temporarily
        const filePath = path.join(tmpDir, `${processedFile.fileId}.pdf`);
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
        
        console.log('Payment session created successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                fileId: processedFile.fileId,
                sessionId: session.id,
                paymentUrl: session.url
            })
        };
        
    } catch (error) {
        console.error('Error processing payment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process payment',
                details: error.message
            })
        };
    }
};