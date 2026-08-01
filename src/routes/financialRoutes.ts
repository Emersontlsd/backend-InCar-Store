import { Router } from 'express';
import { getFinancialSummary } from '../controllers/financialController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// 🛡️ Rota Protegida: Exige que o usuário esteja autenticado E seja administrador para acessar o resumo financeiro
router.get('/admin/financial-summary', authMiddleware, adminMiddleware, getFinancialSummary);

export default router;