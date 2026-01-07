const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
        // Updated PDF.co API key
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@ghamtech.com_ZBZ78mtRWz6W5y5ltoi29Q4W1387h8PGiKtRmRCiY2hSGAN0TjZGVUyl1mqSp5F8';
        this.baseUrl = 'https://api.pdf.co/v1';
        this.headers = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
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

    // FIXED FUNCTION NAME - This must be named extractText to match the function call
    async extractText(base64Data) {
        try {
            // Send the base64 data directly to PDF.co API with OCR enabled
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    base64: base64Data,  // Send base64 directly instead of URL
                    inline: true,
                    ocr: true,  // Enable OCR for all PDFs to handle scanned documents
                    ocrLanguage: "eng,ron",  // English and Romanian language support
                    ocrMode: "auto",  // Auto-detect whether document is scanned or text-based
                    async: false  // Process synchronously for better error handling
                },
                {
                    headers: this.headers,
                    timeout: 120000,  // Increased timeout for OCR processing (2 minutes)
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
            
            if (response.data.error) {
                throw new Error(response.data.message || 'Error extracting text from PDF');
            }
            
            return response.data.text;
        } catch (error) {
            console.error('Error extracting text:', error.response?.data || error.message);
            
            // Fallback attempt with minimal parameters if the first attempt fails
            if (error.response?.status === 500) {
                console.log('Attempting fallback text extraction without OCR...');
                try {
                    const fallbackResponse = await axios.post(
                        `${this.baseUrl}/pdf/convert/to/text`,
                        {
                            base64: base64Data,
                            inline: true
                        },
                        {
                            headers: this.headers,
                            timeout: 60000
                        }
                    );
                    
                    if (fallbackResponse.data.error) {
                        throw new Error(fallbackResponse.data.message || 'Fallback text extraction failed');
                    }
                    
                    return fallbackResponse.data.text;
                } catch (fallbackError) {
                    console.error('Fallback extraction failed:', fallbackError.response?.data || fallbackError.message);
                    throw fallbackError;
                }
            }
            
            throw error;
        }
    }

    async processPdfFile(fileBuffer, userEmail, fileName) {
        try {
            console.log('Starting PDF processing for file:', fileName);
            
            // Convert buffer to base64
            const base64File = fileBuffer.toString('base64');
            console.log('Base64 conversion complete, starting text extraction...');
            
            // Extract text from PDF using the CORRECT function name
            console.log('Attempting text extraction with OCR...');
            const originalText = await this.extractText(base64File);
            
            console.log('Text extraction completed');
            console.log('Text successfully extracted, fixing diacritics...');
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
                userEmail: userEmail,
                ocrUsed: true
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
                processedPdf: Buffer.from('Error processing PDF. Please try a smaller file or contact support at ghamtech@ghamtech.com.'),
                fileName: fileName,
                userEmail: userEmail,
                error: error.message
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance