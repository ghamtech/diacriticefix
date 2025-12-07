const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
        this.apiKey = process.env.PDFCO_API_KEY;
        this.baseUrl = 'https://api.pdf.co/v1';
    }
    
    async processPdfFile(fileBuffer, userEmail, fileName) {
        try {
            console.log('Starting PDF processing...');
            
            // Convert buffer to base64
            const base64File = fileBuffer.toString('base64');
            console.log('Base64 file created, starting text extraction...');
            
            // Extract text from PDF
            const extractResponse = await axios.post(
                `${this.baseUrl}/pdf/extract/text`,
                {
                    url: `application/pdf;base64,${base64File}`,
                    inline: true
                },
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey 
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );
            
            console.log('Text extraction completed');
            
            if (extractResponse.data.error) {
                throw new Error(extractResponse.data.message || 'Error extracting text from PDF');
            }
            
            // Fix diacritics
            const fixedText = this.fixDiacritics(extractResponse.data.text);
            console.log('Diacritics fixed');
            
            // Rebuild PDF with fixed text
            console.log('Starting PDF rebuild...');
            const rebuildResponse = await axios.post(
                `${this.baseUrl}/pdf/edit/replace-text`,
                {
                    url: `application/pdf;base64,${base64File}`,
                    searchString: extractResponse.data.text,
                    replaceString: fixedText,
                    inline: true
                },
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey 
                    },
                    timeout: 60000 // 60 seconds timeout
                }
            );
            
            console.log('PDF rebuild completed');
            
            if (rebuildResponse.data.error) {
                throw new Error(rebuildResponse.data.message || 'Error rebuilding PDF with fixed text');
            }
            
            // Download the processed file
            console.log('Downloading processed file...');
            const pdfResponse = await axios.get(rebuildResponse.data.url, { 
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            console.log('File downloaded successfully');
            
            const fileId = uuidv4();
            const processedBuffer = Buffer.from(pdfResponse.data);
            
            return {
                fileId: fileId,
                processedPdf: processedBuffer,
                fileName: fileName,
                userEmail: userEmail
            };
            
        } catch (error) {
            console.error('PDF processing error:', error);
            console.error('Error details:', error.response?.data || error.message);
            throw new Error('Failed to process PDF file: ' + (error.response?.data?.message || error.message));
        }
    }
    
    fixDiacritics(text) {
        const brokenDiacritics = {
            'Ã£Æ\'Â¢': 'â',
            'Ã£Æ\'â€ž': 'ă',
            'Ã£Æ\'Ë†': 'î',
            'Ã£Æ\'Åž': 'ș',
            'Ã£Æ\'Å¢': 'ț',
            'Ã£Æ\'Ëœ': 'Ș',
            'Ã£Æ\'Å£': 'Ț',
            'Æ\'': 'ș',
            'â€žÆ\'': 'ă',
            'Ã¢': 'â',
            'Ã£': 'ă',
            'Ã®': 'î',
            'ÅŸ': 'ș',
            'Å£': 'ț',
            'Åž': 'Ș',
            'Å¢': 'Ț',
            'Ä\u0083': 'ă',
            'Ãƒ': 'ă',
            'ÃŽ': 'Î',
            'Ã®': 'î'
        };
        
        let fixedText = text;
        Object.entries(brokenDiacritics).forEach(([bad, good]) => {
            const escapedBad = bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedBad, 'g');
            fixedText = fixedText.replace(regex, good);
        });
        
        return fixedText;
    }
    
    async markFileAsPaid(fileId, transactionId) {
        console.log(`File ${fileId} marked as paid with transaction ${transactionId}`);
        return true;
    }
    
    getProcessedFile(fileId) {
        // In a real implementation, this would retrieve from storage
        return {
            fileId: fileId,
            fileName: 'document_reparat.pdf',
            content: Buffer.from('PDF content would be here', 'utf-8')
        };
    }
}

module.exports = new PdfService();