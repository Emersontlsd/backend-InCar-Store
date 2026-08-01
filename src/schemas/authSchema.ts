import { z } from "zod";
import { validateCPF } from "../utils/validators.js";

export const registerSchema = z.object({
  name: z
    .string()
    .min(3)
    .refine(
      (val) => {
        const trimmed = val.trim();
        return (
          trimmed.includes(" ") &&
          trimmed.split(" ").filter(Boolean).length >= 2
        );
      },
      { message: "Nome completo obrigatório (Nome e Sobrenome)" },
    ),

  cpf: z
    .string()
    .refine((val) => validateCPF(val), {
      message: "CPF inválido matematicamente",
    }),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("E-mail em formato inválido"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  gender: z.string().min(1, "Sexo obrigatório"),
  cep: z.string().min(9, "CEP incompleto"),
  street: z.string().min(1, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório"),
  city: z.string().min(1, "Cidade obrigatória"),
  state: z.string().length(2, "UF deve ter 2 caracteres"),
  acceptMarketing: z.boolean().optional(),
});
