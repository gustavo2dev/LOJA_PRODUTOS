const { Pool } = require("pg");
require("dotenv").config();

// Conecta usando a URL fornecida pelo Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões externas com o Supabase
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados Supabase:", err.stack);
  } else {
    console.log("Banco de dados Supabase conectado com sucesso.");
    release();
  }
});

// Criação da tabela (opcional: é recomendado fazer isso diretamente no painel do Supabase)
pool.query(`
  CREATE TABLE IF NOT EXISTS produtos(
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco NUMERIC NOT NULL,
    quantidade INTEGER NOT NULL
  )
`).catch(err => console.error("Erro ao criar tabela:", err));

module.exports = pool;