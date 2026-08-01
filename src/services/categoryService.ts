import { prisma } from "../lib/prisma";

export async function fetchAllCategories() {
  return await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createNewCategory(data: { name: string; slug: string }) {
  return await prisma.category.create({ data });
}

export async function updateExistingCategory(
  id: number,
  data: { name: string; slug: string },
) {
  return await prisma.category.update({
    where: { id },
    data,
  });
}

export async function removeCategory(id: number) {
  return await prisma.category.delete({
    where: { id },
  });
}
