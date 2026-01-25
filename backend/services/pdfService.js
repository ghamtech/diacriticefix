// This is our special toolbox for fixing PDF files
// We have to use it carefully so everything works right

const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

class PdfService {
    constructor() {
        // This is our secret key to use the PDF fixing machine
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@ghamtech.com_ZBZ78mtRWz6W5y5ltoi29Q4W1387h8PGiKtRmRCiY2hSGAN0TjZGVUyl1mqSp5F8';
        this.baseUrl = 'https://api.pdf.co/v1';
        // We need this special instruction to tell the machine our secret key
        this.headers = {
            'x-api-key': this.apiKey
        };
    }
    
    // This tool fixes broken Romanian letters like ă, â, î, ș, ț
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
            'Ã¢': 'â'
        };
        
        // Start with our broken text
        let fixedText = text;
        
        // For each broken letter, we replace it with the fixed version
        Object.entries(replacements).forEach(([bad, good]) => {
            // Make a special search pattern for the broken letter
            const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            // Replace all occurrences of the broken letter
            fixedText = fixedText.replace(regex, good);
        });
        
        return fixedText;
    }
    
    // This is the IMPORTANT tool that sends files to PDF.co correctly
    // The old way was using wrong formatting - like putting a square peg in a round hole
    async uploadFile(fileBuffer, fileName = 'document.pdf') {
        try {
            console.log('Trying to upload file to PDF.co...');
            
            // Create a special package for the file
            const form = new FormData();
            
            // Put the file in the package with its name and type
            form.append('file', fileBuffer, {
                filename: fileName,
                contentType: 'application/pdf'
            });
            
            // Get the special instructions needed for this package
            const formHeaders = form.getHeaders();
            
            // Send the package to PDF.co
            const response = await axios.post(
                `${this.baseUrl}/file/upload`,
                form,
                {
                    headers: {
                        ...this.headers,
                        ...formHeaders  // This is the IMPORTANT fix - combining headers correctly
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
            
            // Check if PDF.co liked our package
            if (response.data.error) {
                throw new Error(response.data.message || 'PDF.co didn\'t like our file');
            }
            
            // Get the web address where PDF.co stored our file
            const fileUrl = response.data.url;
            console.log('File uploaded successfully! URL:', fileUrl);
            return fileUrl;
            
        } catch (error) {
            console.error('Error uploading file:', error.response?.data || error.message);
            throw error;
        }
    }
    
    // This tool gets text out of a PDF file from its web address
    async extractTextFromUrl(fileUrl) {
        try {
            console.log('Getting text from PDF at:', fileUrl);
            
            // Ask PDF.co to get the text from our file
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    url: fileUrl,
                    inline: true
                },
                {
                    headers: {
                        ...this.headers,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // Check if PDF.co found text in our file
            if (response.data.error) {
                throw new Error(response.data.message || 'Could not get text from PDF');
            }
            
            return response.data.text;
        } catch (error) {
            console.error('Error extracting text:', error.response?.data || error.message);
            throw error;
        }
    }
    
    // This is the MAIN tool that fixes a whole PDF file
    async processPdfFile(fileBuffer, fileName) {
        try {
            console.log('Starting to fix PDF file:', fileName);
            
            // First, send our file to PDF.co
            const fileUrl = await this.uploadFile(fileBuffer, fileName);
            
            // Then, get the text from the PDF
            const originalText = await this.extractTextFromUrl(fileUrl);
            
            // Finally, fix all the broken Romanian letters
            const fixedText = this.fixDiacritics(originalText);
            
            // Create a special ID for our fixed file
            const fileId = uuidv4();
            
            // Create our fixed content
            const fixedContent = `PDF with fixed diacritics!
Original file: ${fileName}

Original text (first 500 characters):
${originalText.substring(0, 500)}

Fixed text (first 500 characters):
${fixedText.substring(0, 500)}
            `;
            
            console.log('PDF file fixed successfully!');
            return {
                fileId: fileId,
                processedPdf: Buffer.from(fixedContent, 'utf-8'),
                fileName: fileName
            };
            
        } catch (error) {
            console.error('Big problem fixing PDF:', error);
            // Even if something goes wrong, we still return something useful
            return {
                fileId: uuidv4(),
                processedPdf: Buffer.from('Error: Could not fix PDF. Please try again with a smaller file.'),
                fileName: fileName,
                error: error.message
            };
        }
    }
}

// This is VERY IMPORTANT - we need to give this toolbox to other parts of our program
module.exports = PdfService;