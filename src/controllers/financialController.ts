import { Request, Response } from "express";
import * as financialService from "../services/financialService";

export async function getFinancialSummary(req: Request, res: Response) {
  try {
    const { period, startDate, endDate } = req.query;

    const summary = await financialService.calculateFinancialSummary({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json(summary);
  } catch (error) {
    console.error("Erro ao buscar resumo financeiro:", error);
    return res
      .status(500)
      .json({ message: "Erro ao processar os dados financeiros." });
  }
}
