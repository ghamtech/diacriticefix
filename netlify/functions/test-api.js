const PdfService = require('../../backend/services/pdfService');

exports.handler = async (event, context) => {
    try {
        console.log('Testing API connections...');
        
        // Test PDF.co API
        const pdfcoTest = await PdfService.testApiConnection();
        
        // Return results
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                pdfco: pdfcoTest,
                env: {
                    hasPdfcoKey: !!process.env.PDFCO_API_KEY,
                    baseUrl: process.env.BASE_URL,
                    nodeEnv: process.env.NODE_ENV
                }
            })
        };
    } catch (error) {
        console.error('Error in test-api function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Test failed',
                message: error.message
            })
        };
    }
};