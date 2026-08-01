import { Router } from 'express';
import { 
    getAllCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} from '../controllers/categoryController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';


const router = Router();

// 🌐 Rota Pública: Qualquer usuário (logado ou não) pode listar as categorias
router.get('/categories', getAllCategories);

// 🛡️ Rotas Protegidas: Exigem que o usuário esteja autenticado E seja administrador
router.post('/categories', authMiddleware, adminMiddleware, createCategory);
router.put('/categories/:id', authMiddleware, adminMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, adminMiddleware, deleteCategory);

export default router;