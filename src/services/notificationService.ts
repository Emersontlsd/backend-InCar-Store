import { Resend } from "resend";

// Inicializa o Resend. Se não houver a chave no .env, ele usará um modo de simulação.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEN_API_KEY)
  : null;

interface SendOtpPayload {
  toEmail: string;
  toPhone: string;
  otpCode: string;
  userName: string;
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
      <p style="font-size: 12px; color: #999;">Este código é válido por 5 minutos e só pode ser usado uma vez. Se não foi você quem solicitou, ignore este e-mail.</p>
    </div>
  `;

  // 1. Fluxo de Produção/Testes Reais (Se tiver a API KEY do Resend no .env)
  if (resend) {
    try {
      await resend.emails.send({
        from: "InCar Store <onboarding@resend.dev>",
        to: toEmail,
        subject: subject,
        html: htmlContent,
      });
      console.log(`✉️ [PRODUÇÃO] E-mail enviado com sucesso para ${toEmail}`);

      // 💡 AQUI ENTRARÁ DISPARO DE WHATSAPP NO FUTURO:
      // await enviarWhatsApp(toPhone, `Seu código InCar Store é: ${otpCode}`);

      return;
    } catch (error) {
      console.error("❌ Erro ao enviar e-mail via Resend:", error);
    }
  }

  // 2. Fluxo de Fallback (Caso ainda não tenha criado a conta no Resend)
  console.log("\n--- ⚠️ MODO DE SIMULAÇÃO DE ENVIO ---");
  console.log(`👤 Para: ${userName}`);
  console.log(`📱 Celular: ${toPhone} | 📧 E-mail: ${toEmail}`);
  console.log(`🔑 CÓDIGO OTP GERADO: ${otpCode}`);
  console.log("------------------------------------\n");
};
