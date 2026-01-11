class PaymentService {
    constructor() {
        this.price = 1.99; // Updated price
        this.currency = 'EUR';
    }
    
    generateDownloadLink(fileId, email, transactionId) {
        const baseUrl = process.env.BASE_URL || 'https://diacriticefix.ro';
        return `${baseUrl}/download.html?file_id=${fileId}&email=${encodeURIComponent(email)}&transaction_id=${encodeURIComponent(transactionId)}`;
    }
}

module.exports = new PaymentService();