const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

class PdfService {
    constructor() {
        // Updated PDF.co API key
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@ghamtech.com_ZBZ78mtRWz6W5y5ltoi29Q4W1387h8PGiKtRmRCiY2hSGAN0TjZGVUyl1mqSp5F8';
        this.baseUrl = 'https://api.pdf.co/v1';
        this.headers = {
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

    async uploadFile(fileBuffer, fileName = 'temp.pdf') {
        try {
            // Create form data for file upload
            const form = new FormData();
            form.append('file', fileBuffer, {
                filename: fileName,
                contentType: 'application/pdf'
            });
            
            // Get headers for form data
            const formHeaders = form.getHeaders();
            const headers = {
                ...this.headers,
                ...formHeaders
            };
            
            // Upload file to PDF.co
            const response = await axios.post(
                `${this.baseUrl}/file/upload`,
                form,
                {
                    headers: headers,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000
                }
            );
            
            if (response.data.error) {
                throw new Error(response.data.message || 'Error uploading file to PDF.co');
            }
            
            return response.data.url;
        } catch (error) {
            console.error('Error uploading file:', error.response?.data || error.message);
            throw error;
        }
    }

    async extractTextFromUrl(fileUrl) {
        try {
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

    // THIS IS THE CORRECT FUNCTION NAME - extractText (not extractTextFromBase64)
    async extractText(base64File) {
        try {
            // Convert base64 to buffer
            const fileBuffer = Buffer.from(base64File, 'base64');
            
            // Upload file to get URL
            const fileUrl = await this.uploadFile(fileBuffer, 'temp.pdf');
            console.log('File uploaded successfully, URL:', fileUrl);
            
            // Extract text using the URL
            return await this.extractTextFromUrl(fileUrl);
        } catch (error) {
            console.error('Error in extractText:', error);
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
            const originalText = await this.extractText(base64File);
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
                userEmail: userEmail
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance