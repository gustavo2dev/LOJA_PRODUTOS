require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// -------------------------------------------------------------
// MIDDLEWARES
// -------------------------------------------------------------

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.use(express.static("public"));

// -------------------------------------------------------------
// CONEXÃO COM SUPABASE / POSTGRESQL
// -------------------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

// Testar conexão
pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("=================================");
    console.log("CONEXÃO COM SUPABASE OK!");
    console.log("Data do banco:", result.rows[0].now);
    console.log("=================================");
  })
  .catch((erro) => {
    console.error("ERRO AO CONECTAR AO SUPABASE:");
    console.error(erro.message);
  });

// -------------------------------------------------------------
// CRIAR TABELA
// -------------------------------------------------------------

async function criarTabela() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        quantidade INTEGER NOT NULL
      )
    `);

    console.log("Tabela produtos verificada.");
  } catch (erro) {
    console.error("Erro ao criar tabela:", erro.message);
  }
}

criarTabela();

// -------------------------------------------------------------
// GET - LISTAR PRODUTOS
// -------------------------------------------------------------

app.get("/produtos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM produtos ORDER BY id ASC"
    );

    res.json(result.rows);
  } catch (erro) {
    console.error("Erro ao buscar produtos:", erro);

    res.status(500).json({
      erro: "Erro ao buscar produtos no banco de dados.",
    });
  }
});

// -------------------------------------------------------------
// POST - ADICIONAR PRODUTO
// -------------------------------------------------------------

app.post("/produtos", async (req, res) => {
  const { nome, preco, quantidade } = req.body;

  const p = parseFloat(preco);
  const q = parseInt(quantidade, 10);

  if (!nome || isNaN(p) || isNaN(q) || p <= 0 || q <= 0) {
    return res.status(400).json({
      erro: "Dados inválidos enviados para o servidor.",
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO produtos (nome, preco, quantidade)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [nome, p, q]
    );

    res.status(201).json(result.rows[0]);
  } catch (erro) {
    console.error("Erro ao salvar produto:", erro);

    res.status(500).json({
      erro: "Erro interno ao salvar produto.",
    });
  }
});

// -------------------------------------------------------------
// DELETE - EXCLUIR UM PRODUTO
// -------------------------------------------------------------

app.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM produtos WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado.",
      });
    }

    res.status(204).send();
  } catch (erro) {
    console.error("Erro ao deletar produto:", erro);

    res.status(500).json({
      erro: "Erro ao deletar produto.",
    });
  }
});

// -------------------------------------------------------------
// DELETE - EXCLUIR TODOS
// -------------------------------------------------------------

app.delete("/produtos", async (req, res) => {
  try {
    await pool.query("DELETE FROM produtos");

    res.status(204).send();
  } catch (erro) {
    console.error("Erro ao limpar produtos:", erro);

    res.status(500).json({
      erro: "Erro ao limpar banco de dados.",
    });
  }
});

// -------------------------------------------------------------
// SERVIDOR
// -------------------------------------------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});