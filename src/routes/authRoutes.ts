import { Router } from "express";
import {
  registerUser,
  verifyOtp,
  loginUser,
} from "../controllers/authController.js";

import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/authMiddleware.js";

const router = Router();

// rotas publicas
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOtp);

// Rota protegida (Qualquer cliente logado acessa)
router.get("/me", authMiddleware, (req, res) => {
  // Graças ao middleware, o id do usuário está disponível em req.user.id
  res.json({
    message: "Você está autenticado!",
    userId: req.user?.id,
    role: req.user?.role,
  });
});

// Rota ultra-protegida (Só quem logou com admin@incarstore.com acessa)
router.get("/admin/dashboard", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "Bem-vindo ao painel secreto dos produtos da InCar Store!",
  });
});

export default router;
