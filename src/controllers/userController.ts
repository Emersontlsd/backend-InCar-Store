import { Request, Response } from 'express';
import * as userService from '../services/userService';

export async function getUsers(req: Request, res: Response) {
    try {
        const users = await userService.fetchAllUsers();
        return res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar usuários.' });
    }
}

export async function updateRole(req: Request, res: Response) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { role } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        const updatedUser = await userService.updateUserRole(id, { role });
        return res.json(updatedUser);
    } catch (error) {
        console.error('Erro ao atualizar cargo do usuário:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
    }
}

export async function deleteUser(req: Request, res: Response) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (!id) {
            return res.status(400).json({ error: 'ID do usuário não fornecido.' });
        }

        await userService.removeUser(id);
        return res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        return res.status(500).json({ error: 'Erro interno ao deletar usuário.' });
    }
}