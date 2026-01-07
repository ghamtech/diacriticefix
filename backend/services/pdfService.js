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
        
        let result = text;
        
        Object.entries(replacements).forEach(([bad, good]) => {
            const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            result = result.replace(regex, good);
        });
        
        return result;
    }

    async extractTextFromBase64(base64File) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/pdf/extract/text`,
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

    async createPdfWithFixedText(originalText, fixedText, base64File) {
        try {
            // Find all text positions in the original text
            const diffPositions = [];
            let pos = 0;
            while (pos < originalText.length && pos < fixedText.length) {
                if (originalText.charAt(pos) !== fixedText.charAt(pos)) {
                    diffPositions.push(pos);
                }
                pos++;
            }
            
            // Extract the pages from the PDF
            const extractPagesResponse = await axios.post(
                `${this.baseUrl}/pdf/info`,
                {
                    url: `data:application/pdf;base64,${base64File}`,
                    inline: true
                },
                {
                    headers: this.headers,
                    timeout: 60000
                }
            );
            
            if (extractPagesResponse.data.error) {
                throw new Error(extractPagesResponse.data.message || 'Error extracting pages from PDF');
            }
            
            // Get the page information
            const pages = extractPagesResponse.data.info.pages;
            const totalPages = pages.length;
            
            // Build the edit operations array
            const operations = [];
            let charCount = 0;
            
            // We'll only fix the first 100 diacritics to avoid overloading the API
            const maxOperations = 100;
            
            for (let i = 0; i < diffPositions.length && i < maxOperations; i++) {
                const pos = diffPositions[i];
                const badChar = originalText.charAt(pos);
                const goodChar = fixedText.charAt(pos);
                
                // Skip empty or space characters
                if (!badChar || badChar.trim() === '' || !goodChar || goodChar.trim() === '') {
                    continue;
                }
                
                // Add replace text operation
                operations.push({
                    operation: "replace",
                    find: badChar,
                    replace: goodChar,
                    pages: "1-" + totalPages // Apply to all pages
                });
                
                charCount++;
            }
            
            console.log(`Found ${charCount} diacritics to fix`);
            
            // Apply the text replacement operations
            const replaceResponse = await axios.post(
                `${this.baseUrl}/pdf/edit`,
                {
                    url: `data:application/pdf;base64,${base64File}`,
                    operations: operations,
                    inline: true
                },
                {
                    headers: this.headers,
                    timeout: 120000 // 2 minutes timeout for processing
                }
            );
            
            if (replaceResponse.data.error) {
                throw new Error(replaceResponse.data.message || 'Error replacing text in PDF');
            }
            
            // Download the fixed PDF
            const pdfResponse = await axios.get(replaceResponse.data.url, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            return Buffer.from(pdfResponse.data);
        } catch (error) {
            console.error('Error creating PDF with fixed text:', error.response?.data || error.message);
            
            // Fallback: Create a simple text file with the fixed content
            console.log('Falling back to text file due to PDF creation error');
            const fallbackContent = `PDF with repaired diacritics\n\nOriginal text:\n${originalText.substring(0, 500)}\n\nFixed text:\n${fixedText.substring(0, 500)}\n\nNote: PDF was converted to text due to processing errors.`;
            return Buffer.from(fallbackContent, 'utf8');
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
            const extractedText = await this.extractTextFromBase64(base64File);
            
            console.log('Text extraction response received');
            console.log('Text extraction completed, fixing diacritics...');
            const fixedText = this.fixDiacritics(extractedText);
            
            console.log('Diacritics fixed. Comparison:');
            console.log('Original text length:', extractedText.length);
            console.log('Fixed text length:', fixedText.length);
            
            // Rebuild PDF with fixed text
            console.log('Rebuilding PDF with fixed text...');
            const processedPdfBuffer = await this.createPdfWithFixedText(extractedText, fixedText, base64File);
            
            // Generate file ID
            const fileId = uuidv4();
            
            return {
                fileId: fileId,
                processedPdf: processedPdfBuffer,
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
                processedPdf: Buffer.from('Error processing PDF. Please try again later or contact support.'),
                fileName: fileName,
                userEmail: userEmail,
            };
        }
    }
}

module.exports = PdfService; // Export the class itself, not an instance