import { prisma } from "../lib/prisma";

export async function fetchAllUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(
  id: string,
  data: { role: string },
) {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function removeUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  });
}