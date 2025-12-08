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

    fixDiacriticsSimple(text) {
        const replacements = [
            { from: 'Ã£Æ\'Â¢', to: 'â' },
            { from: 'Ã£Æ\'â€ž', to: 'ă' },
            { from: 'Ã£Æ\'Ë†', to: 'î' },
            { from: 'Ã£Æ\'Åž', to: 'ș' },
            { from: 'Ã£Æ\'Å¢', to: 'ț' },
            { from: 'Ã£Æ\'Ëœ', to: 'Ș' },
            { from: 'Ã£Æ\'Å£', to: 'Ț' },
            { from: 'â€žÆ\'', to: 'ă' },
            { from: 'Ð”', to: 'D' },
            { from: 'Ð¸', to: 'i' },
            { from: 'Ðµ', to: 'e' }
        ];
        
        let fixedText = text;
        
        replacements.forEach(({from, to}) => {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            fixedText = fixedText.replace(regex, to);
        });
        
        return fixedText;
    }

    async extractText(fileData) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/pdf/extract/text`,
                {
                    url: `application/pdf;base64,${fileData}`,
                    inline: true
                },
                {
                    headers: this.headers,
                    timeout: 60000
                }
            );

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
            console.log('Base64 conversion complete');
            
            // Extract text from PDF
            console.log('Attempting text extraction...');
            const extractedText = await this.extractText(base64File);
            console.log('Text extraction completed');
            
            // Fix diacritics
            console.log('Fixing diacritics...');
            const fixedText = this.fixDiacriticsSimple(extractedText);
            console.log('Diacritics fixed');
            
            // For now, we'll create a simple text file with the fixed content
            const fileId = uuidv4();
            const fixedContent = `PDF repaired successfully!\nOriginal file: ${fileName}\nEmail: ${userEmail}\n\nOriginal text (first 500 chars):\n${extractedText.substring(0, 500)}\n\nFixed text (first 500 chars):\n${fixedText.substring(0, 500)}`;
            
            console.log('PDF processing completed successfully');
            return {
                fileId: fileId,
                processedText: fixedContent,
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
                processedText: 'Error processing PDF. Please contact support.',
                fileName: fileName,
                userEmail: userEmail,
                error: error.message
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance