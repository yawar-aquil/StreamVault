
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = join(process.cwd(), 'data', 'streamvault-data.json');
const USERS_FILE = join(process.cwd(), 'data', 'users.json');
const ADMIN_ID = '0229a46c-2302-4909-93c5-c71f80db5538';

async function fixTransactions() {
    console.log('🔧 Starting transaction fix...');

    if (!existsSync(DATA_FILE) || !existsSync(USERS_FILE)) {
        console.error('❌ Data files not found!');
        return;
    }

    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    const userData = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));

    // Normalize users array
    const users = Array.isArray(userData) ? userData : (userData.users || []);
    const admin = users.find((u: any) => u.id === ADMIN_ID);

    if (!admin) {
        console.error('❌ Admin user not found!');
        return;
    }

    console.log(`👤 Admin found: ${admin.username} (Coins: ${admin.coins})`);

    // Initialize coinTransactions if missing
    if (!data.coinTransactions) {
        data.coinTransactions = [];
    }

    // Check if transactions exist for admin
    const adminTx = data.coinTransactions.filter((tx: any) => tx.userId === ADMIN_ID);

    if (adminTx.length === 0 && admin.coins > 0) {
        console.log('📝 No transactions found but user has coins. Adding Welcome Bonus...');

        const welcomeTx = {
            id: randomUUID(),
            userId: ADMIN_ID,
            amount: 500, // Assuming 500 is the starting/current balance
            type: 'gift', // or 'earned'
            description: 'Welcome Bonus',
            createdAt: admin.createdAt || new Date().toISOString() // Backdate to account creation
        };

        data.coinTransactions.push(welcomeTx);

        writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('✅ Transaction added and saved!');
    } else {
        console.log('mj Found existing transactions or 0 balance. No changes needed.');
        console.log(`   Transactions: ${adminTx.length}`);
    }
}

fixTransactions();
