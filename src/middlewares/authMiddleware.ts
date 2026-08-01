import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { success } from "zod";

const JWT_SECRET =
  process.env.JWT_SECRET || "sua_chave_secreta_super_segura_incar";

interface TokenPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

// 👤 Middleware para qualquer usuário autenticado (Customer ou Admin)
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): any => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Token de acesso não fornecido.",
    });
  }

  // O formato esperado do header é: "Bearer TOKEN_AQUI"
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      message: "Formato de token inválido. Use o padrão Bearer.",
    });
  }

  const token = parts[1];

  try {
    // Verifica e decodifica o token usando a mesma chave secreta do Service
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Injeta os dados do usuário na requisição para uso nos próximos controllers
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next(); // Autorizado! Segue para o próximo passo/controller
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido ou expirado.",
    });
  }
};

// 🛡️ Middleware exclusivo para rotas administrativas (ex: cadastrar produto, ver relatórios)
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): any => {
  // Garante que o authMiddleware rodou antes deste
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Usuário não autenticado.",
    });
  }

  // Verifica se a role injetada no token é 'admin'
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message:
        "Acesso negado. Apenas administradores podem acessar este recurso.",
    });
  }

  return next();
};
