exports.handler = async (event, context) => {
    try {
        // Enable CORS
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        };
        
        // Handle preflight request
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }
        
        if (event.httpMethod !== 'GET') {
            return { 
                statusCode: 405, 
                headers,
                body: JSON.stringify({ error: 'Method Not Allowed' }) 
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                env: {
                    hasPdfcoKey: !!process.env.PDFCO_API_KEY,
                    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
                    baseUrl: process.env.BASE_URL,
                    nodeEnv: process.env.NODE_ENV
                }
            })
        };
    } catch (error) {
        console.error('Error checking environment:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
                error: 'Failed to check environment',
                details: error.message
            })
        };
    }
};