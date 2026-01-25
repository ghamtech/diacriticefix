const Stripe = require('stripe');

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
            
            // Get file name from metadata
            const fileName = session.metadata?.fileName || 'document_reparat.pdf';
            
            console.log('Payment verified successfully for file:', fileId);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    fileId: fileId,
                    fileName: fileName
                })
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