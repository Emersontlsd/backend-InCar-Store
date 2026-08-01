import { prisma } from '../lib/prisma'; 

interface FinancialFilters {
    period?: string;
    startDate?: string;
    endDate?: string;
}

export async function calculateFinancialSummary(filters: FinancialFilters) {
    // Resolve o intervalo de datas com base no filtro enviado
    const dateRange = resolveDateRange(filters);

    // 2. Filtro base de pedidos pagos/concluídos dentro do período
    const dateQueryFilter = {
        createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
        },
        // status: 'PAID' ou 'COMPLETED' (descomente/ajuste conforme sua regra de negócio)
    };

    // 3. Buscar todos os pedidos do período para calcular métricas
    const orders = await prisma.order.findMany({
        where: dateQueryFilter,
        include: {
            user: true,
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Faturamento total apenas de pedidos com pagamento APROVADO
    const approvedOrders = orders.filter((order: any) => {
        const pStatus = (order.paymentStatus || '').toLowerCase();
        return pStatus === 'approved' || pStatus === 'paid';
    });

    // Calcular faturamento total
    const totalRevenue = approvedOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);
    const totalOrdersCount = approvedOrders.length;

    // Agrupar valores por forma de pagamento (ex: pix, card/credit_card) (apenas aprovados)
    const paymentMethodsMap: Record<string, number> = {};
    approvedOrders.forEach((order: any) => {
        // Se houver uma coluna de método de pagamento específica futura, ela entra aqui. 
        const method = (order.paymentMethod || 'pix').toLowerCase();
        paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + Number(order.total || 0);
    });

    const paymentMethods = Object.keys(paymentMethodsMap).map(method => ({
        method,
        total: paymentMethodsMap[method]
    }));

    // Processar produtos mais vendidos (baseado em pedidos aprovados)
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    approvedOrders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
            const productId = item.productId;
            const productName = item.product?.name || 'Produto sem nome';
            const quantity = Number(item.quantity || 1);
            const itemPrice = Number(item.priceAtPurchase || 0); // Preço do item no momento da compra
            const itemRevenue = quantity * itemPrice;;

            if (!productSalesMap[productId]) {
                productSalesMap[productId] = { name: productName, quantity: 0, revenue: 0 };
            }

            productSalesMap[productId].quantity += quantity;
            productSalesMap[productId].revenue += itemRevenue;
        });
    });

    const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 produtos mais vendidos

    // Histórico completo de transações (incluindo aprovados, processando e cancelados para as respectivas colunas/visões)
    const recentTransactions = orders.slice(0, 30).map((order: any) => ({
        id: order.id,
        customerName: order.user?.name || 'Cliente',
        date: order.createdAt,
        amount: Number(order.total || 0),
        paymentMethod: order.paymentMethod || 'Pix',
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'pending'
    }));

    return {
        metrics: {
            totalRevenue,
            totalOrdersCount,
            averageTicket: totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0
        },
        paymentMethods,
        topProducts,
        recentTransactions
    };
}

// Auxiliar para calcular datas de início e fim
function resolveDateRange(filters: FinancialFilters) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    end.setHours(23, 59, 59, 999);

    if (filters.startDate && filters.endDate) {
        return { 
            start: new Date(filters.startDate), 
            end: new Date(filters.endDate) 
        };
    }

    switch (filters.period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            start.setMonth(now.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'yearly':
            start.setFullYear(now.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
            break;
        default:
            // Padrão: Último mês
            start.setMonth(now.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
            break;
    }

    return { start, end };
}