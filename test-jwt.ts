import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
console.log('🔍 Checking JWT_SECRET...');

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is NOT set in environment variables!');
    // Check if .env file exists and print its path for debugging
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        console.log(`ℹ️ .env file found at: ${envPath}`);
    } else {
        console.error('⚠️ .env file NOT found!');
    }
} else {
    console.log('✅ JWT_SECRET is set.');
    // Don't print the actual secret for security, maybe just the length or a masked version
    console.log(`🔑 Secret Length: ${JWT_SECRET.length}`);

    try {
        const payload = { userId: '12345', username: 'testuser' };
        console.log('📝 Attempting to sign token...');
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        console.log('✅ Token signed successfully.');
        console.log(`🎫 Token: ${token.substring(0, 20)}...`);

        console.log('🕵️ Attempting to verify token...');
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token verified successfully!');
        console.log('📄 Decoded Payload:', decoded);

    } catch (error) {
        console.error('❌ JWT Operation Failed:', error);
    }
}
