import { Request, Response } from "express";
import { z } from "zod";
import { registerSchema } from "../schemas/authSchema.js";
import {
  executeUserRegistration,
  verifyOtpToken,
} from "../services/authServices.js";
import { executeUserLogin } from "../services/authServices.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    // validação de formato de dados
    const validatedData = registerSchema.parse(req.body);

    // regras de negocio e segurança no service
    const result = await executeUserRegistration(validatedData);

    // resposta limpa para o front
    return res.status(200).json({
      success: true,
      message: "Cadastro inicial realizado. Código de verificação enviado!",
      ...result,
    });
  } catch (error) {
    // tratando erros de validação do Zod
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Erro de validação dos dados",
        errors: error.flatten().fieldErrors,
      });
    }

    // Trata erros disparados pela nossa regra de negócio do Service
    if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "Este CPF, E-mail ou Telefone já está cadastrado.",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Telefone e código são obrigatórios.",
      });
    }

    // chama o serviço de validação
    const sessionData = await verifyOtpToken(phone, code);

    return res.status(200).json({
      success: true,
      message: "Código validado com sucesso! Login autorizado.",
      ...sessionData,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "OTP_EXPIRED_OR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Código expirado ou não solicitado. Peça um novo envio.",
        });
      }

      if (error.message === "INVALID_OTP_CODE") {
        return res.status(400).json({
          success: false,
          message: "Código incorreto. Verifique os dígitos.",
        });
      }
    }
    return res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "E-mail e Telefone são obrigatórios.",
      });
    }

    // Executa a regra de negócio do login
    const result = await executeUserLogin({ phone, email });

    return res.status(200).json({
      success: true,
      message: "Usuário encontrado. Código de acesso enviado!",
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Nenhuma conta ativa foi encontrada com esses dados.",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Erro interno no servidor." });
  }
};
