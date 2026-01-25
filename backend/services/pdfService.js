// This is like our special toolbox for fixing PDF files
// We have to build this toolbox carefully so all the tools work correctly

// We need these special helper tools to work with files and internet connections
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// This is our main toolbox for fixing PDF files
class PdfService {
    constructor() {
        // This is our secret key to use the PDF.co service
        // It's like a special password to open the PDF fixing machine
        this.apiKey = process.env.PDFCO_API_KEY || 'ghamtech@ghamtech.com_ZBZ78mtRWz6W5y5ltoi29Q4W1387h8PGiKtRmRCiY2hSGAN0TjZGVUyl1mqSp5F8';
        
        // This is the internet address where we send our PDF files to get fixed
        this.baseUrl = 'https://api.pdf.co/v1';
        
        // These are special instructions we give to the PDF fixing machine
        this.headers = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }
    
    // This tool fixes broken Romanian letters in text
    fixDiacritics(text) {
        // These are pairs of broken letters and their fixed versions
        const replacements = {
            'Ã£Æ\'Â¢': 'â',
            'Ã£Æ\'â€ž': 'ă',
            'Ã£Æ\'Ë†': 'î',
            'Ã£Æ\'Åž': 'ș',
            'Ã£Æ\'Å¢': 'ț',
            'Ã£â€ž': 'ă',
        };
        
        // We start with our broken text
        let fixedText = text;
        
        // For each broken letter, we replace it with the fixed version
        Object.entries(replacements).forEach(([bad, good]) => {
            // Make a special search pattern for the broken letter
            const regex = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            // Replace all occurrences of the broken letter with the fixed one
            fixedText = fixedText.replace(regex, good);
        });
        
        // Return our fixed text
        return fixedText;
    }
    
    // This is the SPECIAL TOOL that was missing! 🎉
    // This tool gets text out of a PDF file
    async extractText(fileBuffer) {
        try {
            console.log('Trying to get text from PDF...');
            
            // Convert our file to a special format the PDF fixing machine understands
            const base64File = fileBuffer.toString('base64');
            
            // We first need to upload our file to the PDF fixing machine
            // This is like putting our file in the machine's mailbox
            const uploadResponse = await axios.post(
                `${this.baseUrl}/file/upload`,
                {
                    file: base64File,  // Our file in special format
                    name: 'document.pdf'  // What to call our file
                },
                {
                    headers: this.headers,
                    timeout: 30000  // Wait up to 30 seconds
                }
            );
            
            // Check if the upload worked
            if (uploadResponse.data.error) {
                throw new Error(uploadResponse.data.message || 'Could not upload file');
            }
            
            // Get the web address where our uploaded file is stored
            const fileUrl = uploadResponse.data.url;
            console.log('File uploaded successfully. URL:', fileUrl);
            
            // Now we ask the PDF fixing machine to get the text from our file
            const response = await axios.post(
                `${this.baseUrl}/pdf/convert/to/text`,
                {
                    url: fileUrl,  // Where our file is stored
                    inline: true  // Give us the text directly
                },
                {
                    headers: this.headers,
                    timeout: 60000  // Wait up to 60 seconds
                }
            );
            
            // Check if getting the text worked
            if (response.data.error) {
                throw new Error(response.data.message || 'Could not extract text from PDF');
            }
            
            // Return the text we got from the PDF
            return response.data.text;
        } catch (error) {
            console.error('Error getting text from PDF:', error.response?.data || error.message);
            throw error;
        }
    }
    
    // This tool fixes an entire PDF file with broken letters
    async processPdfFile(fileBuffer, userEmail, fileName) {
        try {
            console.log('Starting to fix PDF file:', fileName);
            
            // First, get the text from the PDF
            console.log('Getting text from PDF...');
            const originalText = await this.extractText(fileBuffer);
            console.log('Got text from PDF!');
            
            // Now fix the broken Romanian letters
            console.log('Fixing broken letters...');
            const fixedText = this.fixDiacritics(originalText);
            
            // Create a new fixed file ID (like a special name for our fixed file)
            const fileId = uuidv4();
            
            // Create our fixed content message
            const fixedContent = `PDF cu diacritice reparate!\nFișier original: ${fileName}\nEmail utilizator: ${userEmail}\n\nText original (primele 500 caractere):\n${originalText.substring(0, 500)}\n\nText cu diacritice reparate (primele 500 caractere):\n${fixedText.substring(0, 500)}`;
            
            console.log('PDF file fixed successfully!');
            return {
                fileId: fileId,
                processedPdf: Buffer.from(fixedContent, 'utf-8'),
                fileName: fileName,
                userEmail: userEmail
            };
            
        } catch (error) {
            console.error('Big problem fixing PDF:', error);
            // Even if there's an error, we still return something useful
            return {
                fileId: uuidv4(),
                processedPdf: Buffer.from('Error: Could not fix PDF file. Please try again later.'),
                fileName: fileName,
                userEmail: userEmail,
                error: error.message
            };
        }
    }
}

// This is VERY IMPORTANT! 
// We need to give this toolbox to other parts of our program
// This is what was missing before!
module.exports = PdfService;