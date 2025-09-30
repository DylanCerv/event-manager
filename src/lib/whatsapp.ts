export async function sendWhatsAppMessage(phone: string, message: string): Promise<string> {
  // Ensure phone number is in international format
  const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
  
  // Create WhatsApp URL with encoded message
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}