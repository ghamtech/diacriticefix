const fs = require('fs');
const path = require('path');

const tmpDir = '/tmp/processed-files';

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== 'GET') {
            return { 
                statusCode: 405, 
                body: JSON.stringify({ error: 'Method Not Allowed' }) 
            };
        }
        
        const { file_id: fileId } = event.queryStringParameters;
        
        if (!fileId) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'File ID is required' }) 
            };
        }
        
        console.log('Getting file:', fileId);
        
        // Get file path
        const filePath = path.join(tmpDir, `${fileId}.pdf`);
        
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath);
            return { 
                statusCode: 404, 
                body: JSON.stringify({ error: 'File not found or has expired' }) 
            };
        }
        
        // Read file
        const fileContent = fs.readFileSync(filePath);
        
        // Delete file after reading (cleanup)
        fs.unlinkSync(filePath);
        console.log('File deleted after reading:', fileId);
        
        // Get filename from metadata or use default
        const fileName = `document_reparat.pdf`;
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`
            },
            body: fileContent.toString('base64'),
            isBase64Encoded: true
        };
        
    } catch (error) {
        console.error('Error getting file:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to retrieve file',
                details: error.message
            })
        };
    }
};