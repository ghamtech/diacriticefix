const PdfService = require('../../backend/services/pdfService');

exports.handler = async (event, context) => {
    try {
        console.log('Testing API connections...');
        
        // Instead of using /info endpoint, let's test with a simple operation
        // We'll use the PdfService to test the connection
        const pdfService = new PdfService();
        
        // Create a small test PDF (just a simple text document)
        const testText = "This is a test PDF for API connectivity check.";
        const base64TestPdf = Buffer.from(testText).toString('base64');
        
        // Try to extract text from our test content
        let pdfcoTest;
        try {
            const result = await pdfService.extractTextFromBase64(base64TestPdf);
            pdfcoTest = {
                success: true,
                message: 'API connection and text extraction successful'
            };
        } catch (error) {
            pdfcoTest = {
                success: false,
                error: error.message,
                status: error.response?.status || 500
            };
        }
        
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