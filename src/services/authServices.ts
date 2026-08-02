import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { sendOtpNotification } from "./notificationService.js";

const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_super_segura_incar";

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

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.user.create({
    data: {
      ...userData,
      role: userData.email.toLowerCase().trim() === "admin@incarstore.com" ? "admin" : "customer",
      otpCode,
      otpExpiresAt,
    },
  });

  await sendOtpNotification({
    toEmail: userData.email,
    toPhone: userData.phone,
    otpCode: otpCode,
    userName: userData.name,
  });

  return {
    destination: userData.phone,
    method: "whatsapp" as const,
  };
};

export const executeUserLogin = async (loginData: { phone: string; email: string }) => {
  const user = await prisma.user.findUnique({
    where: { phone: loginData.phone },
  });

  if (!user || user.email.toLowerCase().trim() !== loginData.email.toLowerCase().trim()) {
    throw new Error("USER_NOT_FOUND");
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiresAt },
  });

  await sendOtpNotification({
    toEmail: user.email,
    toPhone: user.phone,
    otpCode: otpCode,
    userName: user.name,
  });

  return {
    destination: user.phone,
    method: "whatsapp" as const,
  };
};

export const verifyOtpToken = async (phone: string, code: string) => {
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user || !user.otpCode || !user.otpExpiresAt) {
    throw new Error("OTP_EXPIRED_OR_NOT_FOUND");
  }

  if (new Date() > user.otpExpiresAt) {
    throw new Error("OTP_EXPIRED_OR_NOT_FOUND");
  }

  if (user.otpCode !== code) {
    throw new Error("INVALID_OTP_CODE");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiresAt: null },
  });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
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