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

    async extractTextFromBase64(base64File) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/pdf/extract/text`,
                {
                    url: `application/pdf;base64,${base64File}`,
                    inline: true
                },
                { 
                    headers: this.headers,
                    timeout: 30000 // 30 seconds timeout
                }
            );
            
            if (response.data.error) {
                throw new Error(response.data.message || 'Error extracting text from PDF');
            }
            
            return response.data.text;
        } catch (error) {
            console.error('Error extracting text:', error);
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
            const fixedText = this.fixDiacriticsSimple(originalText);
            
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', originalText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // Create a simple text response (in a real app, this would rebuild the PDF)
            const processedContent = `
PDF cu diacritice reparate
===============================

Fișier original: ${fileName}
Email utilizator: ${userEmail}
Data procesării: ${new Date().toISOString()}

Text original (primele 500 de caractere):
${originalText.substring(0, 500)}

Text cu diacritice reparate (primele 500 de caractere):
${fixedText.substring(0, 500)}
            `;
            
            // Simulate PDF content (in a real app, this would be the actual PDF buffer)
            const processedBuffer = Buffer.from(processedContent, 'utf8');
            
            console.log('PDF processing completed successfully');
            return {
                fileId: uuidv4(),
                processedPdf: processedBuffer,
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
                processedPdf: Buffer.from('Eroare la procesarea PDF-ului. Vă rugăm să contactați suportul.'),
                fileName: fileName,
                userEmail: userEmail,
                error: error.message
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance