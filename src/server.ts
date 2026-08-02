import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import financialRoutes from "./routes/financialRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "*", 
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api", financialRoutes);

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor rodando de forma ultra organizada em http://localhost:${PORT}`,
  );
});
