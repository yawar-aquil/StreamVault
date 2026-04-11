import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialization to avoid startup crashes if env is not ready
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay credentials missing in .env");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

export async function createRazorpayOrder(amount: number, currency: string, receiptId: string) {
    const normalizedCurrency = (currency || 'INR').toUpperCase();
    const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit
        currency: normalizedCurrency,
        receipt: receiptId,
    };
    try {
        const instance = getRazorpay();
        const order = await instance.orders.create(options);
        return order;
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        throw error;
    }
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!process.env.RAZORPAY_KEY_SECRET) return false;

    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    return expectedSignature === signature;
}
