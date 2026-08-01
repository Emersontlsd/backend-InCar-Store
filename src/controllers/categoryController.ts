import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService';

// 📂 Listar todas as categorias com a contagem de produtos vinculados
export async function getAllCategories(req: Request, res: Response) {
  try {
    const categories = await categoryService.fetchAllCategories();
    return res.json(categories)
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return res.status(500).json({ message: "Erro ao buscar categorias." });
  }
}

export async function createCategory(req: Request, res: Response) {
    try {
        const { name, slug } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: "Nome e slug são obrigatórios." });
        }

        const newCategory = await categoryService.createNewCategory({ name, slug });
        return res.status(201).json({ message: "Categoria criada com sucesso!", category: newCategory});
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        return res.status(500).json({ message: 'Erro ao criar categoria.' });
    }
}

export async function updateCategory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, slug } = req.body;

        const updatedCategory = await categoryService.updateExistingCategory(Number(id), { name, slug });
        return res.json({ message: 'Categoria atualizada com sucesso!', category: updatedCategory });
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        return res.status(500).json({ message: 'Erro ao atualizar a categoria.' });
    }
}

export async function deleteCategory(req: Request, res: Response) {
    try {
        const { id } = req.params;
        await categoryService.removeCategory(Number(id));
        return res.json({ message: 'Categoria removida com sucesso!' });
    } catch (error) {
        console.error('Erro ao remover categoria:', error);
        return res.status(500).json({ message: 'Erro ao remover categoria.' });
    }
}


