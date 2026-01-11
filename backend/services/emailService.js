const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    
    async sendDownloadEmail(to, downloadLink, fileName, transactionId) {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a237e; margin-bottom: 10px;">DiacriticeFix</h1>
                    <p style="color: #666; font-size: 14px;">Repară automat diacriticile din PDF-uri</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
                    <h2 style="color: #1a237e; margin-top: 0;">Documentul tău a fost reparat cu succes!</h2>
                    <p style="line-height: 1.6; margin-bottom: 20px;">
                        Am reparat toate diacriticile (ș, ț, â, î, ă) din documentul tău. Poți descărca versiunea curățată folosind butonul de mai jos.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${downloadLink}" style="background: #e91e63; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; display: inline-block;">
                            DESCARCĂ PDF-UL REPARAT
                        </a>
                    </div>
                    
                    <p style="line-height: 1.6; color: #666; font-size: 14px;">
                        <strong>Atenție:</strong> Link-ul de descărcare este valabil pentru 60 de minute. Dacă expiră, te rugăm să contactezi suportul.
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>ID tranzacție:</strong> ${transactionId}
                        </p>
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>Document:</strong> ${fileName}
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>© 2025 GhamTech S.R.L. | CUI: 50686976 | Bacău, România</p>
                    <p style="margin-top: 5px;">
                        <a href="mailto:contact@diacriticefix.ro" style="color: #666; text-decoration: none;">
                            contact@diacriticefix.ro
                        </a>
                    </p>
                </div>
            </div>
        `;
        
        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: to,
            subject: 'DiacriticeFix - Documentul tău a fost reparat',
            html: htmlContent
        });
        
        console.log(`Download email sent to ${to} for file ${fileName}`);
        return true;
    }
}

module.exports = new EmailService();