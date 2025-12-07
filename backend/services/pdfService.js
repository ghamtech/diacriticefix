const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@gmail.com_5UO5OkNnmQiGRSqCA54MrzUrukIL4la9T47xXC92S8OWXwgifOYoU7SHS7lf7WmP';
        this.baseUrl = 'https://api.pdf.co/v1';
        this.headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
        };
    }
    
    /**
     * Simple diacritic fixing function that works as a fallback
     */
    fixDiacriticsSimple(text) {
        const replacements = [
            { from: 'Ã£Æ\'Â¢', to: 'â' },
            { from: 'Ã£Æ\'â€ž', to: 'ă' },
            { from: 'Ã£Æ\'Ë†', to: 'î' },
            { from: 'Ã£Æ\'Åž', to: 'ș' },
            { from: 'Ã£Æ\'Å¢', to: 'ț' },
            { from: 'Ã£Æ\'Ëœ', to: 'Ș' },
            { from: 'Ã£Æ\'Å£', to: 'Ț' },
            { from: 'Æ\'', to: 'ș' },
            { from: 'â€žÆ\'', to: 'ă' },
            { from: 'Ã¢', to: 'â' },
            { from: 'Â¢', to: '' },
            { from: 'â€', to: '' },
            { from: 'â€œ', to: '"' },
            { from: 'â€', to: '"' },
            { from: 'ÅŸ', to: 'ș' },
            { from: 'Å£', to: 'ț' },
            { from: 'Äƒ', to: 'ă' },
            { from: 'Ã®', to: 'î' },
            { from: 'Ã£', to: 'ă' },
            { from: 'Ä‚', to: 'Ă' },
            { from: 'È™', to: 'ș' },
            { from: 'È›', to: 'ț' },
            { from: 'Ä°', to: 'İ' },
            { from: 'Åž', to: 'Ș' },
            { from: 'Å¢', to: 'Ț' }
        ];
        
        let fixedText = text;
        
        replacements.forEach(({from, to}) => {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            fixedText = fixedText.replace(regex, to);
        });
        
        return fixedText;
    }

    /**
     * Test if PDF.co API is working
     */
    async testApiConnection() {
        try {
            const response = await axios.post(
                `${this.baseUrl}/info`,
                {},
                { headers: this.headers, timeout: 5000 }
            );
            
            console.log('PDF.co API connection successful:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('PDF.co API connection failed:', error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data?.message || error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Process PDF file with fallback options
     */
    async processPdfFile(fileBuffer, userEmail, fileName) {
        try {
            console.log('Starting PDF processing for file:', fileName);
            
            // Convert buffer to base64
            const base64File = fileBuffer.toString('base64');
            console.log('Base64 conversion complete, starting text extraction...');
            
            // First try to extract text
            console.log('Attempting text extraction...');
            const extractResponse = await axios.post(
                `${this.baseUrl}/pdf/extract/text`,
                {
                    url: `data:application/pdf;base64,${base64File}`,
                    inline: true
                },
                { 
                    headers: this.headers,
                    timeout: 30000 // 30 seconds timeout
                }
            );
            
            console.log('Text extraction response received');
            
            if (extractResponse.data.error) {
                throw new Error(extractResponse.data.message || 'Error extracting text from PDF');
            }
            
            console.log('Text successfully extracted, fixing diacritics...');
            const originalText = extractResponse.data.text;
            const fixedText = this.fixDiacriticsSimple(originalText);
            
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', originalText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // Log first 100 characters of both texts for debugging
            console.log('Original text sample:', originalText.substring(0, 100));
            console.log('Fixed text sample:', fixedText.substring(0, 100));
            
            // If text is too short, use fallback approach
            if (fixedText.length < 10) {
                console.warn('Text extraction returned very short content, using fallback method');
                return {
                    fileId: uuidv4(),
                    processedText: fixedText,
                    isFallback: true,
                    fileName: fileName,
                    userEmail: userEmail
                };
            }
            
            // If text is unchanged after fixing, log a warning
            if (originalText === fixedText) {
                console.warn('No diacritics were fixed, original text equals fixed text');
            }
            
            console.log('PDF processing completed successfully');
            return {
                fileId: uuidv4(),
                processedText: fixedText,
                isFallback: false,
                fileName: fileName,
                userEmail: userEmail
            };
            
        } catch (error) {
            console.error('Critical error in PDF processing:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // Return a fallback result so the user can still proceed
            return {
                fileId: uuidv4(),
                processedText: 'Error processing PDF. Please try again or contact support.',
                isFallback: true,
                error: error.message,
                fileName: fileName,
                userEmail: userEmail
            };
        }
    }

    /**
     * Fallback method to create a new PDF with the fixed text
     */
    async createPdfFromText(textContent, originalFileName) {
        try {
            // For now, just return the text content
            // In a real implementation, this would use PDF.co or another service to create a PDF
            return {
                fileId: uuidv4(),
                content: textContent,
                fileName: originalFileName.replace('.pdf', '_reparat.txt')
            };
        } catch (error) {
            console.error('Error creating PDF from text:', error);
            throw error;
        }
    }
}

module.exports = new PdfService();