import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function adminMiddleware(req: any, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.id; // Obtido do authMiddleware anterior

        if (!userId) {
            return res.status(401).json({
                message: 'Não autorizado.'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                message: 'Acesso negado. Apenas administradores.'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: 'Erro na verificação de permissão de admin.'
        });
    }
}