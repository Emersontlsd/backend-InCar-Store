import { Resend } from "resend";
import axios from "axios";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendOtpPayload {
  toEmail: string;
  toPhone: string;
  otpCode: string;
  userName: string;
}

// Função auxiliar para envio de WhatsApp (Evolution API / Z-API ou similar)
async function sendWhatsAppMessage(phone: string, message: string) {
  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_API_TOKEN;

  if (!whatsappApiUrl || !whatsappToken || !phone) {
    return; // Se não configurado ou sem telefone, ignora
  }

  try {
    const cleanPhone = phone.replace(/\D/g, ''); 
    await axios.post(whatsappApiUrl, {
      phone: cleanPhone,
      message: message,
    }, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`
      }
    });
    console.log(`📱 [WHATSAPP] Mensagem enviada para ${cleanPhone}`);
  } catch (error) {
    console.error("❌ Erro ao enviar WhatsApp:", error);
  }
}

export const sendOtpNotification = async ({
  toEmail,
  toPhone,
  otpCode,
  userName,
}: SendOtpPayload): Promise<void> => {
  const subject = `🔑 Seu código de acesso InCar Store: ${otpCode}`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a1a1a;">Olá, ${userName}!</h2>
      <p style="font-size: 16px; color: #555;">Você solicitou um acesso à <strong>InCar Store</strong>.</p>
      <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #999;">Este código é válido por 5 minutos e só pode ser usado uma vez.</p>
    </div>
  `;

  const whatsappMessage = `🚗 *InCar Store*\n\nOlá ${userName}, seu código de acesso é: *${otpCode}*`;

  // 1. Fluxo de Produção (Resend + WhatsApp juntos)
  if (resend) {
    try {
      await Promise.all([
        resend.emails.send({
          from: "InCar Store <onboarding@resend.dev>",
          to: toEmail,
          subject: subject,
          html: htmlContent,
        }),
        sendWhatsAppMessage(toPhone, whatsappMessage)
      ]);

      console.log(`✉️ [PRODUÇÃO] Notificações enviadas para ${toEmail} / ${toPhone}`);
      return;
    } catch (error) {
      console.error("❌ Erro ao enviar via Resend:", error);
    }
  }

  // 2. Fluxo de Fallback (Simulação no Console)
  console.log("\n--- ⚠️ MODO DE SIMULAÇÃO DE ENVIO ---");
  console.log(`👤 Para: ${userName}`);
  console.log(`📱 Celular: ${toPhone} | 📧 E-mail: ${toEmail}`);
  console.log(`🔑 CÓDIGO OTP GERADO: ${otpCode}`);
  console.log("------------------------------------\n");
};