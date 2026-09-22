class Produto {
  #preco;
  #quantidade;

  constructor(nome, preco, quantidade) {
    const precoNumerico = parseFloat(preco);
    const quantidadeNumerica = parseInt(quantidade, 10);

    if (
      !nome.trim() ||
      !Number.isFinite(precoNumerico) ||
      !Number.isInteger(quantidadeNumerica) ||
      precoNumerico <= 0 ||
      quantidadeNumerica <= 0
    ) {
      throw new Error("Dados inválidos para o produto");
    }

    this.nome = nome;
    this.#preco = precoNumerico;
    this.#quantidade = quantidadeNumerica;
  }

  get preco() {
    return this.#preco;
  }

  get quantidade() {
    return this.#quantidade;
  }

  valorTotal() {
    return this.#preco * this.#quantidade;
  }

  toJSON() {
    return {
      nome: this.nome,
      preco: this.#preco,
      quantidade: this.#quantidade,
    };
  }
}

const API_URL =
  window.location.protocol === "file:"
    ? "http://localhost:3000/produtos"
    : `${window.location.origin}/produtos`;

// CADASTRAR PRODUTO

document
  .getElementById("produto-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome").value;

    const preco = document.getElementById("preco").value;

    const quantidade = document.getElementById("quantidade").value;

    try {
      const novoProduto = new Produto(nome, preco, quantidade);

      const resposta = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(novoProduto.toJSON()),
      });

      if (!resposta.ok) {
        const erroDoServidor = await resposta.json().catch(() => null);

        throw new Error(
          erroDoServidor?.erro ||
            "Erro ao salvar o produto no servidor backend",
        );
      }

      await renderizarTabela();

      e.target.reset();
    } catch (erro) {
      alert(erro.message);
    }
  });

// MOSTRAR PRODUTOS

async function renderizarTabela() {
  try {
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error("Não foi possível buscar os produtos no servidor");
    }

    const dadosBrutosDoServidor = await resposta.json();

    if (!Array.isArray(dadosBrutosDoServidor)) {
      throw new Error("Resposta inválida recebida do servidor");
    }

    const tabela = document.querySelector("#tabela-produtos tbody");

    tabela.innerHTML = "";

    let totalAcumulado = 0;

    dadosBrutosDoServidor.forEach((dados) => {
      const produto = new Produto(dados.nome, dados.preco, dados.quantidade);

      totalAcumulado += produto.valorTotal();

      const row = document.createElement("tr");

      row.innerHTML = `
                <td>${produto.nome}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${produto.valorTotal().toFixed(2)}</td>
                <td>
                    <button type="button">
                        Apagar
                    </button>
                </td>
            `;

      const botao = row.querySelector("button");

      botao.addEventListener("click", () => deletarProduto(dados.id));

      tabela.appendChild(row);
    });

    document.getElementById("total-estoque").textContent =
      `Total em estoque: R$ ${totalAcumulado.toFixed(2)}`;
  } catch (erro) {
    console.error("Erro ao buscar dados no servidor:", erro);
  }
}

// APAGAR UM PRODUTO

async function deletarProduto(id) {
  if (id === undefined || id <= 0) {
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      const erroServidor = await resposta.json().catch(() => null);

      throw new Error(erroServidor?.erro || "Erro ao apagar o produto");
    }

    await renderizarTabela();
  } catch (erro) {
    console.error("Erro ao apagar produto:", erro);
  }
}

// APAGAR TODOS

document
  .getElementById("limpar-tabela")
  .addEventListener("click", async function () {
    try {
      const resposta = await fetch(API_URL, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        throw new Error("Erro ao limpar produtos");
      }

      await renderizarTabela();
    } catch (erro) {
      console.error("Erro ao limpar dados no servidor:", erro);
    }
  });

// INICIALIZAÇÃO

renderizarTabela();
