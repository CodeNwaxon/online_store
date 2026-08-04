'use server';

import { sendEmail } from '@/lib/sendEmail';

export async function sendDeliveryEmailAction(
  email: string,
  customerName: string,
  orderId: string,
  isShip: boolean,
  shippingMaxDays: number
) {
  if (!email) return { success: false, error: 'No email provided' };

  const deliveryNote = isShip
    ? `<br><br>📌 <b>Estimated Delivery Time:</b> Max ${shippingMaxDays} Business ${shippingMaxDays === 1 ? 'Day' : 'Days'} (items may arrive earlier!). If your order does not arrive within ${shippingMaxDays} ${shippingMaxDays === 1 ? 'day' : 'days'}, you get a full 100% refund.`
    : '';

  const deliveredMessage = isShip 
    ? "Your order has been <b>delivered</b> and should arrive shortly!"
    : "Your order has been <b>delivered</b>, You can come pick it up!";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <p>Hello ${customerName || 'Customer'},</p>
      <p>Warm greetings from <b>NOMO STOREZ</b> !!! 🌟</p>
      <p>${deliveredMessage}${deliveryNote}</p>
      <p>You can view and download your <b>Customer's Copy Receipt</b> here:<br>
      <a href="https://nomo-stores.com/receipt/${orderId}">https://nomo-stores.com/receipt/${orderId}</a></p>
      <p>Thank you for shopping with us!</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: 'Your Order has been Delivered! - Nomo Store',
    html
  });
}
