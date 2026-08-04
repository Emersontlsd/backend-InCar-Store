import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Rota pública para ver a vitrine
router.get('/', getProducts);

// Rota protegida para o Admin cadastrar produtos
router.post('/', authMiddleware, adminMiddleware, createProduct);

// Rota para editar produto (Admin)
router.put('/:id', authMiddleware, adminMiddleware, updateProduct);

// Rota para excluir produto (Admin) 👇 ADICIONE ESTA LINHA
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;