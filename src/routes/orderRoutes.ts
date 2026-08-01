import { Router } from "express";
import {
  createOrder,
  getClientOrders,
  getAllOrdersAdmin,
  updateOrderStatus,
  simulatePixPayment,
  mercadoPagoWebHook,
  getOrderById
} from "../controllers/orderController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const router = Router();

// ==========================================
// 🛡️ ROTAS DO ADMINISTRADOR
// ==========================================
// Listar todos os pedidos da loja no painel admin
router.get("/admin", authMiddleware, adminMiddleware, getAllOrdersAdmin);

// Atualizar o status do pedido (Ex: mudar para 'delivered' após a entrega)
router.patch(
  "/admin/:id/status",
  authMiddleware,
  adminMiddleware,
  updateOrderStatus,
);

// ==========================================
// 👤 ROTAS DO CLIENTE
// ==========================================
router.post("/", authMiddleware, createOrder);
router.get("/my-history", authMiddleware, getClientOrders);

// Rota temporária de teste para simular o pagamento do Pix
router.patch("/:id/simulate-pix", authMiddleware, simulatePixPayment);

// 🔔 Rota pública de Webhook do Mercado Pago (Sem authMiddleware)
router.post("/webhook/mercadopago", mercadoPagoWebHook);

// Rota para buscar o pedido por ID (usada pelo polling do Pix)
router.get("/:id", getOrderById);

export default router;