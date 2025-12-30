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

    fixDiacritics(text) {
        const replacements = {
            'Ã£Æ\'Â¢': 'â',
            'Ã£Æ\'â€ž': 'ă',
            'Ã£Æ\'Ë†': 'î',
            'Ã£Æ\'Åž': 'ș',
            'Ã£Æ\'Å¢': 'ț',
            'Ã£Æ\'Ëœ': 'Ș',
            'Ã£Æ\'Å£': 'Ț',
            'â€žÆ\'': 'ă',
            'Ã¢': 'â',
            'Â¢': '',
            'â€': '',
            'â€œ': '"',
            'â€': '"',
            'ÅŸ': 'ș',
            'Å£': 'ț',
            'Äƒ': 'ă',
            'Ã®': 'î',
            'Ã£': 'ă',
            'Ä‚': 'Ă',
            'È™': 'ș',
            'È›': 'ț',
            'Ä°': 'İ',
            'Åž': 'Ș',
            'Å¢': 'Ț'
        };
        
        let fixedText = text;
        Object.entries(replacements).forEach(([bad, good]) => {
            const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            fixedText = fixedText.replace(regex, good);
        });
        
        return fixedText;
    }

    // Fixed function name to match what's being called
    async extractTextFromBase64(base64File) {
        try {
            // First upload the file to get a public URL
            const uploadResponse = await axios.post(
                `${this.baseUrl}/file/upload`,
                {
                    name: 'temp.pdf',
                    content: base64File
                },
                {
                    headers: this.headers,
                    timeout: 60000
                }
            );
            
            if (uploadResponse.data.error) {
                throw new Error(uploadResponse.data.message || 'Error uploading file to PDF.co');
            }
            
            const fileUrl = uploadResponse.data.url;
            console.log('File uploaded successfully, URL:', fileUrl);
            
            // Now extract text using the URL
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    url: fileUrl,
                    inline: true
                },
                {
                    headers: this.headers,
                    timeout: 60000
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
            console.log('Base64 conversion complete');
            
            // Extract text from PDF using the correct function name
            console.log('Attempting text extraction...');
            const originalText = await this.extractTextFromBase64(base64File);
            console.log('Text extraction completed');
            
            // Fix diacritics
            console.log('Fixing diacritics...');
            const fixedText = this.fixDiacritics(originalText);
            
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', originalText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // Create the repaired PDF content
            const fileId = uuidv4();
            const fixedContent = `PDF repaired successfully!
Original file: ${fileName}
Email: ${userEmail}

Original text (first 500 chars):
${originalText.substring(0, 500)}

Fixed text (first 500 chars):
${fixedText.substring(0, 500)}
            `;
            
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