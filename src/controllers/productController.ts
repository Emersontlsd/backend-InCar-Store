import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Listar todos os produtos da vitrine
export async function getProducts(req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({
      include: { category: true }, // Traz os dados da categoria associada
      orderBy: { createdAt: "desc" },
    });
    return res.json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos: ", error);
    return res.status(500).json({
      message: "Erro interno ao buscar produtos",
    });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const { name, price, categoryId, stock, image, description } = req.body;

    if (!name || !price || !image || !description) {
      return res.status(400).json({
        message: "Preencha todos os campos obrigatórios do produto.",
      });
    }

    // Tratamento inteligente: Se vier o ID ou o nome da categoria, resolvemos aqui
    let finalCategoryId: number | null = null;
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      if (!isNaN(Number(categoryId))) {
        finalCategoryId = Number(categoryId);
      } else {
        // Se mandaram o nome por engano, buscamos ou criamos pelo nome
        const catRecord = await prisma.category.upsert({
          where: { name: String(categoryId) },
          update: {},
          create: {
            name: String(categoryId),
            slug: String(categoryId)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
          },
        });
        finalCategoryId = catRecord.id;
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        stock: stock !== undefined ? Number(stock) : 0,
        image,
        description,
        categoryId: finalCategoryId,
      },
      include: { category: true },
    });

    return res.status(201).json({
      message: "Produto cadastrado com sucesso!",
      product: newProduct,
    });
  } catch (error) {
    console.error("Erro ao criar produto. ", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar produto.",
    });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, price, categoryId, stock, image, description } = req.body;

    const productExists = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!productExists) {
      return res.status(404).json({
        message: "Produto não encontrado.",
      });
    }

    // Valida se a categoria informada realmente existe no banco antes de atualizar
    let finalCategoryId: number | null = null;
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      if (!isNaN(Number(categoryId))) {
        finalCategoryId = Number(categoryId);
      } else {
        const catRecord = await prisma.category.upsert({
          where: { name: String(categoryId) },
          update: {},
          create: {
            name: String(categoryId),
            slug: String(categoryId)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
          },
        });
        finalCategoryId = catRecord.id;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name : undefined,
        price: price !== undefined ? Number(price) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        image: image !== undefined ? image : undefined,
        description: description !== undefined ? description : undefined,
        categoryId: finalCategoryId
      },
      include: { category: true },
    });

    return res.json({
      message: "Produto atualizado com sucesso!",
      product: updatedProduct,
    });
  } catch (error) {
    console.log("Erro ao atualizar produto: ", error);
    return res.status(500).json({
      message: "Erro interno ao atualizar produto",
    });
  }
}
