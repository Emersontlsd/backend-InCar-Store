import { Router } from 'express';
import { getUsers, updateRole, deleteUser } from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Aplica autenticação e verificação de admin em todas as rotas de usuários
router.use(authMiddleware, adminMiddleware);

router.get('/', getUsers);
router.patch('/:id/role', updateRole);
router.delete('/:id', deleteUser);

export default router;