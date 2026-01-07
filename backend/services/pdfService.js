const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@ghamtech.com_ZBZ78mtRWz6W5y5ltoi29Q4W1387h8PGiKtRmRCiY2hSGAN0TjZGVUyl1mqSp5F8';
        this.baseUrl = 'https://api.pdf.co/v1';
        this.headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
        };
    }
    
    fixDiacritics(text) {
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

    // CORRECTED ENDPOINT: Changed from /v1/pdf/extract/text to /v1/pdf/convert/to/text
    async extractTextFromBase64(base64File) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    url: `data:application/pdf;base64,${base64File}`,
                    inline: true
                },
                {
                    headers: this.headers,
                    timeout: 60000 // 60 seconds timeout
                }
            );

            if (response.data.error) {
                throw new Error(response.data.message || 'Error extracting text from PDF');
            }
            
            return response.data.text;
        } catch (error) {
            console.error('Error extracting text:', error.response?.data || error.message);
            throw error;
        }
    }

    async processPdfFile(fileBuffer, userEmail, fileName) {
        try {
            console.log('Starting PDF processing for file:', fileName);
            
            // Convert buffer to base64
            const base64File = fileBuffer.toString('base64');
            console.log('Base64 conversion complete, starting text extraction...');
            
            // First try to extract text
            console.log('Attempting text extraction...');
            const originalText = await this.extractTextFromBase64(base64File);
            
            console.log('Text extraction response received');
            console.log('Text successfully extracted, fixing diacritics...');
            const fixedText = this.fixDiacritics(originalText);
            
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', originalText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // For now, we'll create a simple text file with the fixed content
            const fileId = uuidv4();
            const fixedContent = `PDF repaired successfully!\nOriginal file: ${fileName}\nEmail: ${userEmail}\n\nOriginal text (first 500 chars):\n${originalText.substring(0, 500)}\n\nFixed text (first 500 chars):\n${fixedText.substring(0, 500)}`;
            
            console.log('PDF processing completed successfully');
            return {
                fileId: fileId,
                processedPdf: Buffer.from(fixedContent, 'utf-8'),
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
            
            // Return a fallback result
            return {
                fileId: uuidv4(),
                processedPdf: Buffer.from('Error processing PDF. Please try again with a different file or contact support.'),
                fileName: fileName,
                userEmail: userEmail,
                error: error.message
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance