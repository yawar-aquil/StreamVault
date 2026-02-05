
import { config } from 'dotenv';
config();

import { sendCoinPurchaseReceiptEmail } from '../server/email-service';

async function testEmail() {
    console.log("--------------------------------------------------");
    console.log("🧪 STARTING STANDALONE EMAIL TEST");
    console.log("--------------------------------------------------");

    const recipient = "helloscreations5m@gmail.com"; // User's requested email
    const username = "TestUser";
    const amount = 500;
    const cost = "$4.99";
    const balance = 1000;
    const txId = "test-tx-123";

    try {
        console.log(`Attempting to send email to: ${recipient}`);
        const result = await sendCoinPurchaseReceiptEmail(recipient, username, amount, cost, balance, txId);
        console.log("--------------------------------------------------");
        console.log(`✅ Result: ${result}`);
        console.log("--------------------------------------------------");
    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    }
}

testEmail();
