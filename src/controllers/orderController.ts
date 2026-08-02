import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
  options: { timeout: 5000 },
});

// 🛒 Criar Pedido (Checkout)
export async function createOrder(req: Request, res: Response) {
  try {
    console.log("--- REQUISIÇÃO CHEGOU NO CREATEORDER ---", req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const {
      items,
      paymentMethod,
      fulfillmentType,
      shippingCost = 0,
      cardTokenId,
      installments,
      payerIdentification,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "O carrinho está vazio." });
    }

    const { orderResult, mpPaymentData } = await prisma.$transaction(
      async (tx) => {
        let subtotal = 0;
        const orderItemsData = [];

        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Produto com ID ${item.productId} não encontrado.`);
          }

          // 📦 VALIDAÇÃO DE ESTOQUE: Impede a compra se o estoque for menor que o solicitado
          if (product.stock < item.quantity) {
            throw new Error(
              `Estoque insuficiente para o produto "${product.name}". Disponível: ${product.stock}, solicitado: ${item.quantity}.`,
            );
          }

          const itemTotal = Number(product.price) * item.quantity;
          subtotal += itemTotal;

          orderItemsData.push({
            productId: product.id,
            quantity: item.quantity,
            priceAtPurchase: product.price,
          });
        }

        const total =
          subtotal +
          (fulfillmentType === "delivery" ? Number(shippingCost) : 0);

        // Cria o pedido com status de pagamento pendente inicialmente
        const newOrder = await tx.order.create({
          data: {
            userId,
            total,
            status: "em_separacao",
            paymentStatus: "pending",
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId } });
        const payment = new Payment(client);
        let paymentResponse = null;

        if (paymentMethod === "pix") {
          paymentResponse = await payment.create({
            body: {
              transaction_amount: Number(total),
              description: `Pedido #${newOrder.id} - InCar Store`,
              payment_method_id: "pix",
              payer: {
                email: user?.email || "cliente@incarstore.com",
              },
              external_reference: String(newOrder.id),
            },
          });
        } else if (paymentMethod === "credit") {
          paymentResponse = await payment.create({
            body: {
              transaction_amount: Number(total),
              description: `Pedido #${newOrder.id} - InCar Store`,
              token: cardTokenId,
              installments: Number(installments) || 1,
              payer: {
                email: user?.email || "cliente@incarstore.com",
                identification: {
                  type: payerIdentification?.type || "CPF",
                  number: payerIdentification?.number || "00000000000",
                },
              },
              external_reference: String(newOrder.id),
            },
          });

          const paymentStatusVal = paymentResponse.status
            ? String(paymentResponse.status)
            : null;

          // Se o cartão foi aprovado imediatamente, atualiza o paymentStatus
          if (paymentResponse.status === "approved") {
            await tx.order.update({
              where: { id: newOrder.id },
              data: { paymentStatus: "approved" },
            });
            newOrder.paymentStatus = "approved";
          } else {
            await tx.order.update({
              where: { id: newOrder.id },
              data: { paymentStatus: paymentStatusVal },
            });
            newOrder.paymentStatus = paymentStatusVal;
          }
        }
        return { orderResult: newOrder, mpPaymentData: paymentResponse };
      },
    );

    const responsePayload: any = {
      message: "Pedido realizado com sucesso!",
      order: orderResult,
    };

    if (paymentMethod === "pix") {
      responsePayload.pix = mpPaymentData?.point_of_interaction
        ?.transaction_data
        ? {
            qrCodeBase64:
              mpPaymentData.point_of_interaction.transaction_data
                .qr_code_base64,
            qrCodeCopyPaste:
              mpPaymentData.point_of_interaction.transaction_data.qr_code,
          }
        : null;
    } else if (paymentMethod === "credit") {
      responsePayload.paymentStatus = mpPaymentData?.status;

      if (mpPaymentData?.status !== "approved") {
        return res.status(400).json({
          message: `Pagamento não aprovado. Status: ${mpPaymentData?.status_detail || mpPaymentData?.status}`,
        });
      }
    }

    return res.status(201).json(responsePayload);
  } catch (error: any) {
    console.error("Erro no checkout / Mercado Pago:", error);
    return res.status(500).json({
      message: error.message || "Erro interno ao processar o pagamento.",
      details: error.cause || null,
    });
  }
}

// 📦 Histórico do Cliente Logado
export async function getClientOrders(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(orders);
  } catch (error) {
    console.error("Erro ao buscar histórico: ", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar histórico de pedidos." });
  }
}

// 🛡️ [ADMIN] Listar todos os pedidos da loja (Com nome e status de pagamento)
export async function getAllOrdersAdmin(req: any, res: Response) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ordersWithUser = await Promise.all(
      orders.map(async (order) => {
        const user = await prisma.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true, phone: true },
        });
        return { ...order, user };
      }),
    );

    return res.json(ordersWithUser);
  } catch (error) {
    console.error("Erro ao buscar pedidos globais: ", error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar todos os pedidos." });
  }
}

// 🛡️ [ADMIN] Atualizar status do pedido (Com Baixa Automática de Estoque ao Entregar)
export async function updateOrderStatus(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validateStatuses = [
      "pending",
      "processing",
      "em_separacao",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validateStatuses.includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const orderIdNumber = Number(id);

    // Busca o pedido atual para checar status anterior e itens
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderIdNumber },
      include: { items: true },
    });

    if (!currentOrder) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    // Executa a alteração e a baixa de estoque de forma segura via transação
    const updateOrder = await prisma.$transaction(async (tx) => {
        // Se o status mudou para 'delivered' e antes não era, abate o estoque dos produtos
        if (status === 'delivered' && currentOrder.status !== 'delivered') {
            for (const item of currentOrder.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }
        }

        return await tx.order.update({
            where: { id: orderIdNumber },
            data: { status }
        });
    });

    return res.json({
      message: "Status atualizado com sucesso!",
      order: updateOrder,
    });
  } catch (error) {
    console.error("Erro ao atualizar status. ", error);
    res.status(500).json({ message: "Erro ao atualizar o status do pedido." });
  }
}

// 💸 Simular Pagamento do Pix
export async function simulatePixPayment(req: any, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        status: "em_separacao",
        paymentStatus: "approved",
      },
    });

    return res.json({
      message: "Pagamento via PIX simulado e aprovado com sucesso!",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Erro ao simular pagamento:", error);
    return res.status(500).json({ message: "Erro ao simular pagamento." });
  }
}

// 🔔 Webhook do Mercado Pago
export async function mercadoPagoWebHook(req: any, res: Response) {
  const signature = req.headers['x-signature'];
  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const paymentId = data.id;
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      const orderId = paymentInfo.external_reference;
      const status = paymentInfo.status ? String(paymentInfo.status) : null;

      if (orderId) {
        await prisma.order.update({
          where: { id: Number(orderId) },
          data: {
            paymentStatus: status,
            ...(status === "approved" ? { status: "em_separacao" } : {}),
          },
        });
        console.log(
          `✅ Pedido #${orderId} atualizado via Webhook. Status Pagamento: ${status}`,
        );
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook do Mercado Pago:", error);
    return res.status(500).json({ received: false });
  }
}

// 🔍 Buscar Pedido por ID (Usado pelo polling do Pix)
export async function getOrderById(req: any, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    return res.json(order);
  } catch (error) {
    console.error("Erro ao buscar pedido por ID:", error);
    return res.status(500).json({ message: "Erro ao buscar pedido." });
  }
}
