const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
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
            const form = new FormData();
            form.append('file', fileBuffer, {
                filename: fileName,
                contentType: 'application/pdf'
            });
            
            const formHeaders = form.getHeaders();
            const headers = {
                ...this.headers,
                ...formHeaders
            };
            
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
            
            // Clean URL - remove any special characters or line breaks
            return response.data.url.trim();
        } catch (error) {
            console.error('Error uploading file:', error.response?.data || error.message);
            throw error;
        }
    }

    async extractTextFromUrl(fileUrl) {
        try {
            // Simplified request - first try without OCR
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    url: fileUrl,
                    inline: true,
                    async: false
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );
            
            if (response.data.error) {
                console.log('Basic text extraction failed, trying with OCR...');
                // Fallback to OCR if basic extraction fails
                try {
                    const ocrResponse = await axios.post(
                        `${this.baseUrl}/pdf/convert/to/text`,
                        {
                            url: fileUrl,
                            inline: true,
                            ocr: true,
                            ocrLanguage: "eng,ron",
                            async: false
                        },
                        {
                            headers: {
                                'x-api-key': this.apiKey,
                                'Content-Type': 'application/json'
                            },
                            timeout: 120000 // 2 minutes for OCR
                        }
                    );
                    
                    if (ocrResponse.data.error) {
                        throw new Error(ocrResponse.data.message || 'OCR text extraction failed');
                    }
                    
                    return ocrResponse.data.text;
                } catch (ocrError) {
                    console.error('OCR extraction failed:', ocrError.response?.data || ocrError.message);
                    // Return a fallback result with the URL for manual processing
                    return `PDF processing failed. Original file URL: ${fileUrl}. Please contact support for manual processing.`;
                }
            }
            
            return response.data.text;
        } catch (error) {
            console.error('Error extracting text:', error.response?.data || error.message);
            throw error;
        }
    }

    async processPdfFile(fileBuffer, fileName) {
        try {
            console.log('Starting PDF processing for file:', fileName);
            
            // Step 1: Upload file to get URL
            const fileUrl = await this.uploadFile(fileBuffer, fileName);
            console.log('File uploaded successfully, URL:', fileUrl);
            
            // Step 2: Extract text using the URL
            const originalText = await this.extractTextFromUrl(fileUrl);
            console.log('Text extraction completed');
            
            // Step 3: Fix diacritics
            const fixedText = this.fixDiacritics(originalText);
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', originalText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // Step 4: Generate file ID and processed content
            const fileId = uuidv4();
            const fixedContent = `PDF repaired successfully!
Original file: ${fileName}

Original text (first 500 chars):
${originalText.substring(0, 500)}

Fixed text (first 500 chars):
${fixedText.substring(0, 500)}
            `;
            
            console.log('PDF processing completed successfully');
            return {
                fileId: fileId,
                processedPdf: Buffer.from(fixedContent, 'utf-8'),
                fileName: fileName
            };
            
        } catch (error) {
            console.error('Critical error in PDF processing:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // Return a fallback result
            const fileId = uuidv4();
            return {
                fileId: fileId,
                processedPdf: Buffer.from('Error processing PDF. Please try with a smaller file or contact support.'),
                fileName: fileName,
                error: error.message
            };
        }
    }
}

module.exports = PdfService;