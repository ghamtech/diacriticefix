const PdfService = require('../../backend/services/pdfService');

exports.handler = async (event, context) => {
    try {
        console.log('Testing API connections...');
        
        // Check if PDF.co API key is set
        if (!process.env.PDFCO_API_KEY) {
            console.error('PDFCO_API_KEY environment variable is not set');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'PDFCO_API_KEY environment variable is not set'
                })
            };
        }
        
        // Test PDF.co API connection
        try {
            const pdfService = new PdfService();
            
            // Create a simple test string to extract text from
            const testText = "Test PDF with diacritics: ș, ț, â, î, ă";
            const testPdfContent = Buffer.from(testText).toString('base64');
            
            const extractedText = await pdfService.extractTextFromBase64(testPdfContent);
            
            console.log('PDF.co API connection successful, extracted text:', extractedText);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'API connection successful',
                    extractedText: extractedText
                })
            };
        } catch (error) {
            console.error('PDF.co API connection failed:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    error: error.response?.data?.message || error.message,
                    status: error.response?.status
                })
            };
        }
    } catch (error) {
        console.error('Critical error in test-api function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Test failed',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};