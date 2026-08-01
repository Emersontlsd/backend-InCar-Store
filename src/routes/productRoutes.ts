import { Router } from 'express';
import { getProducts, createProduct, updateProduct } from '../controllers/productController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rota pública para ver a vitrine
router.get('/', getProducts);

// Rota protegida para o Admin cadastrar produtos
router.post('/', authMiddleware, adminMiddleware, createProduct);

// Rota para editar produto (Admin)
router.put('/:id', authMiddleware, adminMiddleware, updateProduct);

export default router;