import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma.js";
import { sendOtpNotification } from "./notificationService.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "sua_chave_secreta_super_segura_incar";

interface RegisterData {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  acceptMarketing?: boolean;
}

export const executeUserRegistration = async (userData: RegisterData) => {
  // Verifica se o e-mail, telefone ou CPF já existem no Supabase
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: userData.email },
        { phone: userData.phone },
        { cpf: userData.cpf },
      ],
    },
  });
  if (existingUser) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  // gera o codigo OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  // define expiração em 5 minutos
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // cria o usuario direto no banco salvando o codigo otp temporario
  await prisma.user.create({
    data: {
      ...userData,
      role:
        userData.email.toLowerCase().trim() === "admin@incarstore.com"
          ? "admin"
          : "customer",
      otpCode,
      otpExpiresAt,
    },
  });

  // Dispara a notificação real (E-mail / Log de segurança)
  await sendOtpNotification({
    toEmail: userData.email,
    toPhone: userData.phone,
    otpCode: otpCode,
    userName: userData.name,
  });

  console.log(`🔑 [OTP CADASTRO] Código para ${userData.phone}: ${otpCode}`);

  return {
    destination: userData.phone,
    method: "whatsapp" as const,
  };
};

// SOLICITAÇÃO DE LOGIN PARA USUÁRIO EXISTENTE
export const executeUserLogin = async (loginData: {
  phone: string;
  email: string;
}) => {
  // Busca o usuário no banco
  const user = await prisma.user.findUnique({
    where: { phone: loginData.phone },
  });

  // Valida se o usuário existe e se o e-mail bate
  if (
    !user ||
    user.email.toLowerCase().trim() !== loginData.email.toLowerCase().trim()
  ) {
    throw new Error("USER_NOT_FOUND");
  }

  // Gera um novo OTP para o login
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Atualiza o registro do usuário com o novo token de acesso temporário
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiresAt },
  });

  // Dispara a notificação real no Login
  await sendOtpNotification({
    toEmail: user.email,
    toPhone: user.phone,
    otpCode: otpCode,
    userName: user.name,
  });

  console.log(`🔑 [OTP LOGIN] Código para ${loginData.phone}: ${otpCode}`);

  return {
    destination: loginData.phone,
    method: "whatsapp" as const,
  };
};

// VALIDAÇÃO DO CÓDIGO OTP E GERAÇÃO DO JWT REAL
export const verifyOtpToken = async (phone: string, code: string) => {
  // busca o usuario pelo telefone
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  // Se não achar o usuário ou ele não tiver um código ativo no banco
  if (!user || !user.otpCode || !user.otpExpiresAt) {
    throw new Error("OTP_EXPIRED_OR_NOT_FOUND");
  }

  // Verifica se o código expirou comparando as datas
  if (new Date() > user.otpExpiresAt) {
    throw new Error("OTP_EXPIRED_OR_NOT_FOUND");
  }

  // Verifica se o dígito bate
  if (user.otpCode !== code) {
    throw new Error("INVALID_OTP_CODE");
  }

  // OTP VÁLIDO! Limpa os campos de OTP do banco por segurança (Single Use)
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiresAt: null },
  });

  // Gera o Token JWT Real baseado no ID e Role do usuário do Supabase
  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }, // Usuário logado por 7 dias
  );

  return {
    token,
    role: user.role,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      cep: user.cep,
      street: user.street,
      number: user.number,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
    },
  };
};
