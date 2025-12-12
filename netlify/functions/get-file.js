const fs = require('fs');
const path = require('path');

const tmpDir = '/tmp/processed-files';

exports.handler = async (event, context) => {
    try {
        // Enable CORS
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        };
        
        // Handle preflight request
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }
        
        if (event.httpMethod !== 'GET') {
            return { 
                statusCode: 405, 
                headers,
                body: JSON.stringify({ error: 'Method Not Allowed' }) 
            };
        }
        
        const { queryStringParameters } = event;
        const { file_id: fileId } = queryStringParameters;
        
        if (!fileId) {
            return { 
                statusCode: 400, 
                headers,
                body: JSON.stringify({ error: 'File ID is required' }) 
            };
        }
        
        console.log('Getting file:', fileId);
        
        // Get file path
        const filePath = path.join(tmpDir, `${fileId}.txt`);
        
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath);
            return { 
                statusCode: 404, 
                headers,
                body: JSON.stringify({ error: 'File not found or has expired' }) 
            };
        }
        
        // Read file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Delete file after reading (cleanup)
        fs.unlinkSync(filePath);
        console.log('File deleted after reading:', fileId);
        
        // Get filename from metadata or use default
        const fileName = `document_reparat.txt`;
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="${fileName}"`
            },
            body: fileContent
        };
        
    } catch (error) {
        console.error('Error getting file:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify({
                error: 'Failed to retrieve file',
                details: error.message
            })
        };
    }
};