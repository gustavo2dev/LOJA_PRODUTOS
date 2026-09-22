const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const pastaBanco = path.join(__dirname, "DATA");
fs.mkdirSync(pastaBanco, { recursive: true });

const db = new sqlite3.Database(path.join(pastaBanco, "estoque.db"), (erro) => {
  if (erro) {
    console.error("Erro ao abrir banco:", erro.message);
  } else {
    console.log("Banco de dados aberto com sucesso.");
  }
});

db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS produtos(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          preco REAL NOT NULL,
          quantidade INTEGER NOT NULL
        )
      `);
});

module.exports = db;
