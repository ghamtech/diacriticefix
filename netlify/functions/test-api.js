// This is like a test machine to check if our PDF fixing tools are working
// We use it to make sure everything is connected properly

// Get our PDF fixing toolbox
const PdfService = require('../../backend/services/pdfService');

// This is the main test function
exports.handler = async (event, context) => {
    try {
        console.log('Starting API test...');
        
        // Check if we have our secret key
        if (!process.env.PDFCO_API_KEY) {
            console.error('PDF.co API key is missing!');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'Missing PDF.co API key'
                })
            };
        }
        
        try {
            // Create our PDF fixing toolbox
            const pdfService = new PdfService();
            
            // Create a small test PDF with some text to check
            const testText = "Test PDF with Romanian letters: ă, â, î, ș, ț";
            const testFileBuffer = Buffer.from(testText);
            
            // Try to get text from our test PDF
            const extractedText = await pdfService.extractText(testFileBuffer);
            
            console.log('PDF.co API test successful! Got text:', extractedText);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'API connection successful',
                    extractedText: extractedText.substring(0, 100) + '...' // Show first 100 characters
                })
            };
        } catch (error) {
            console.error('PDF.co API test failed:', error);
            console.error('Error details:', error.response?.data || error.message);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    error: error.response?.data?.message || error.message,
                    status: error.response?.status,
                    details: error.response?.data
                })
            };
        }
    } catch (error) {
        console.error('Big problem in test:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Test failed',
                message: error.message
            })
        };
    }
};