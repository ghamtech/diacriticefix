const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const tmpDir = '/tmp/processed-files';

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { 
                statusCode: 405, 
                body: JSON.stringify({ error: 'Method Not Allowed' }) 
            };
        }
        
        const { sessionId } = JSON.parse(event.body);
        
        if (!sessionId) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Session ID is required' }) 
            };
        }
        
        console.log('Verifying payment session:', sessionId);
        
        // Verify payment with Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== 'paid') {
            console.log('Payment not completed:', session.payment_status);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Payment not completed' })
            };
        }
        
        // Get file ID from client reference ID
        const fileId = session.client_reference_id;
        
        if (!fileId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'File ID not found in session' })
            };
        }
        
        console.log('Payment verified successfully for file:', fileId);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                fileId: fileId,
                fileName: session.metadata?.fileName || 'document_reparat.pdf'
            })
        };
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to verify payment',
                details: error.message
            })
        };
    }
};