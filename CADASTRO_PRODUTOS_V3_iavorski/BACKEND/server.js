const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Carrega .env somente quando estiver rodando localmente
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({
        path: path.join(__dirname, '.env')
    });
}

const app = express();

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })
    : null;

// ==========================================
// CONFIGURAÇÕES
// ==========================================

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
    limit: '10mb'
}));

// ==========================================
// FRONTEND
// ==========================================

const frontendPath = path.join(__dirname, '../FRONTEND');

app.use(express.static(frontendPath));

// ==========================================
// IMAGENS
// ==========================================

app.use(
    '/img',
    express.static(path.join(__dirname, 'img'))
);

// ==========================================
// CONEXÃO COM BANCO
// ==========================================

if (!pool) {
    console.warn(
        'DATABASE_URL não definida. Configure DATABASE_URL na Vercel.'
    );
}

// ==========================================
// CRIAÇÃO DA TABELA
// ==========================================

let schemaPromise = null;

async function garantirBanco(req, res, next) {

    if (!pool) {
        return res.status(503).json({
            erro: 'Banco de dados indisponível. Configure DATABASE_URL no ambiente da Vercel.'
        });
    }

    try {

        if (!schemaPromise) {

            schemaPromise = pool.query(`
                CREATE TABLE IF NOT EXISTS produtos (
                    id SERIAL PRIMARY KEY,
                    nome TEXT NOT NULL,
                    preco NUMERIC(10,2) NOT NULL,
                    quantidade INTEGER NOT NULL,
                    imagem TEXT
                );
            `).then(async () => {

                await pool.query(`
                    ALTER TABLE produtos
                    ADD COLUMN IF NOT EXISTS imagem TEXT;
                `);

            });

        }

        await schemaPromise;

        next();

    } catch (erro) {

        schemaPromise = null;

        console.error(
            'Erro ao preparar banco:',
            erro
        );

        return res.status(503).json({
            erro: 'Não foi possível conectar ao banco de dados. Verifique DATABASE_URL e o Supabase.'
        });
    }
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/health', (req, res) => {

    res.status(200).json({
        ok: true,
        message: 'Backend funcionando',
        database: Boolean(pool)
    });

});

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

app.get('/', (req, res) => {

    res.sendFile(
        path.join(frontendPath, 'index.html')
    );

});

// ==========================================
// LISTAR PRODUTOS
// ==========================================

app.get('/produtos', garantirBanco, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                nome,
                preco,
                quantidade,
                imagem
            FROM produtos
            ORDER BY id ASC
        `);

        res.status(200).json(result.rows);

    } catch (erro) {

        console.error(
            'Erro ao buscar produtos:',
            erro
        );

        res.status(500).json({
            erro: 'Erro ao buscar produtos no banco de dados.'
        });
    }

});

// ==========================================
// BUSCAR PRODUTO POR ID
// ==========================================

app.get('/produtos/:id', garantirBanco, async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {

        return res.status(400).json({
            erro: 'ID inválido'
        });

    }

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                nome,
                preco,
                quantidade,
                imagem
            FROM produtos
            WHERE id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                erro: 'Produto não encontrado'
            });

        }

        res.status(200).json(result.rows[0]);

    } catch (erro) {

        console.error(
            'Erro ao buscar produto:',
            erro
        );

        res.status(500).json({
            erro: 'Erro ao buscar produto.'
        });
    }

});

// ==========================================
// CADASTRAR PRODUTO
// ==========================================

app.post('/produtos', garantirBanco, async (req, res) => {

    const {
        nome,
        preco,
        quantidade,
        imagem
    } = req.body;

    const nomeNormalizado =
        typeof nome === 'string'
            ? nome.trim()
            : '';

    const precoNumero = Number(preco);

    const quantidadeNumero = Number(quantidade);

    if (
        !nomeNormalizado ||
        !Number.isFinite(precoNumero) ||
        !Number.isInteger(quantidadeNumero) ||
        precoNumero <= 0 ||
        quantidadeNumero <= 0
    ) {

        return res.status(400).json({
            erro: 'Dados inválidos enviados para o servidor.'
        });

    }

    try {

        const result = await pool.query(
            `
            INSERT INTO produtos
                (nome, preco, quantidade, imagem)
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id,
                nome,
                preco,
                quantidade,
                imagem
            `,
            [
                nomeNormalizado,
                precoNumero,
                quantidadeNumero,
                imagem || null
            ]
        );

        res.status(201).json(
            result.rows[0]
        );

    } catch (erro) {

        console.error(
            'Erro ao salvar produto:',
            erro
        );

        res.status(500).json({
            erro: 'Erro interno ao salvar produto.'
        });
    }

});

// ==========================================
// ATUALIZAR PRODUTO
// ==========================================

app.put('/produtos/:id', garantirBanco, async (req, res) => {

    const id = Number(req.params.id);

    const {
        nome,
        preco,
        quantidade,
        imagem
    } = req.body;

    const nomeNormalizado =
        typeof nome === 'string'
            ? nome.trim()
            : '';

    const precoNumero = Number(preco);

    const quantidadeNumero = Number(quantidade);

    if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !nomeNormalizado ||
        !Number.isFinite(precoNumero) ||
        !Number.isInteger(quantidadeNumero) ||
        precoNumero <= 0 ||
        quantidadeNumero <= 0
    ) {

        return res.status(400).json({
            erro: 'Dados inválidos.'
        });

    }

    try {

        const result = await pool.query(
            `
            UPDATE produtos
            SET
                nome = $1,
                preco = $2,
                quantidade = $3,
                imagem = $4
            WHERE id = $5
            RETURNING
                id,
                nome,
                preco,
                quantidade,
                imagem
            `,
            [
                nomeNormalizado,
                precoNumero,
                quantidadeNumero,
                imagem || null,
                id
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });

        }

        res.status(200).json(
            result.rows[0]
        );

    } catch (erro) {

        console.error(
            'Erro ao atualizar produto:',
            erro
        );

        res.status(500).json({
            erro: 'Erro ao atualizar produto.'
        });
    }

});

// ==========================================
// DELETAR PRODUTO POR ID
// ==========================================

app.delete('/produtos/:id', garantirBanco, async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {

        return res.status(400).json({
            erro: 'ID inválido.'
        });

    }

    try {

        const result = await pool.query(
            `
            DELETE FROM produtos
            WHERE id = $1
            `,
            [id]
        );

        if (result.rowCount === 0) {

            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });

        }

        res.status(204).send();

    } catch (erro) {

        console.error(
            'Erro ao deletar produto:',
            erro
        );

        res.status(500).json({
            erro: 'Erro ao deletar produto.'
        });
    }

});

// ==========================================
// DELETAR TODOS OS PRODUTOS
// ==========================================

app.delete('/produtos', garantirBanco, async (req, res) => {

    try {

        await pool.query(
            'DELETE FROM produtos'
        );

        res.status(204).send();

    } catch (erro) {

        console.error(
            'Erro ao limpar produtos:',
            erro
        );

        res.status(500).json({
            erro: 'Erro ao limpar banco de dados.'
        });
    }

});

// ==========================================
// ROTA NÃO ENCONTRADA
// ==========================================

app.use((req, res) => {

    res.status(404).json({
        erro: 'Rota não encontrada',
        rota: req.originalUrl
    });

});

// ==========================================
// SERVIDOR LOCAL
// ==========================================

if (require.main === module) {

    const PORT =
        Number(process.env.PORT) || 3000;

    const server = app.listen(
        PORT,
        () => {

            console.log(
                `Servidor rodando em http://localhost:${PORT}`
            );

        }
    );

    async function encerrarServidor() {

        server.close();

        if (pool) {
            await pool.end();
        }

    }

    process.on(
        'SIGINT',
        encerrarServidor
    );

    process.on(
        'SIGTERM',
        encerrarServidor
    );
}

module.exports = app;
