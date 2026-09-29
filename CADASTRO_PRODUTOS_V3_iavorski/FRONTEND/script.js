// ============================================================
// CLASSE PRODUTO
// ============================================================

class Produto {
  #preco;
  #quantidade;

  constructor(nome, preco, quantidade) {
    const nomeNormalizado =
      typeof nome === "string" ? nome.trim() : "";

    const precoNumerico = Number(preco);
    const quantidadeNumerica = Number(quantidade);

    if (
      !nomeNormalizado ||
      !Number.isFinite(precoNumerico) ||
      !Number.isInteger(quantidadeNumerica) ||
      precoNumerico <= 0 ||
      quantidadeNumerica <= 0
    ) {
      throw new Error("Dados inválidos para o produto");
    }

    this.nome = nomeNormalizado;
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
      quantidade: this.#quantidade
    };
  }
}


// ============================================================
// CONFIGURAÇÃO DA API
// ============================================================

// Quando estiver na Vercel:
// https://lojadeprodutos.vercel.app/produtos
//
// Quando abrir o HTML diretamente no computador:
// http://localhost:3000/produtos

const API_URL =
  window.location.protocol === "file:"
    ? "http://localhost:3000/produtos"
    : `${window.location.origin}/produtos`;


// ============================================================
// FUNÇÃO AUXILIAR PARA LER ERROS DO SERVIDOR
// ============================================================

async function obterMensagemErro(resposta, mensagemPadrao) {
  try {
    const dados = await resposta.json();

    if (dados?.erro) {
      return dados.erro;
    }

    if (dados?.message) {
      return dados.message;
    }
  } catch (erro) {
    // A resposta não era JSON.
  }

  return mensagemPadrao;
}


// ============================================================
// CADASTRAR PRODUTO
// ============================================================

const formularioProduto = document.getElementById("produto-form");

if (formularioProduto) {
  formularioProduto.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome")?.value ?? "";
    const preco = document.getElementById("preco")?.value ?? "";
    const quantidade =
      document.getElementById("quantidade")?.value ?? "";

    try {
      // Cria o objeto usando a classe Produto
      const novoProduto = new Produto(
        nome,
        preco,
        quantidade
      );

      console.log("Enviando produto para:", API_URL);

      const resposta = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(
          novoProduto.toJSON()
        )
      });

      if (!resposta.ok) {
        const mensagem = await obterMensagemErro(
          resposta,
          `Erro ao salvar produto. Código HTTP: ${resposta.status}`
        );

        throw new Error(mensagem);
      }

      const produtoCriado = await resposta.json();

      console.log(
        "Produto cadastrado:",
        produtoCriado
      );

      // Atualiza a tabela
      await renderizarTabela();

      // Limpa o formulário
      formularioProduto.reset();

      alert("Produto cadastrado com sucesso!");

    } catch (erro) {
      console.error(
        "Erro ao cadastrar produto:",
        erro
      );

      alert(
        erro.message ||
        "Não foi possível cadastrar o produto."
      );
    }
  });
}


// ============================================================
// BUSCAR E MOSTRAR PRODUTOS
// ============================================================

async function renderizarTabela() {
  try {
    console.log(
      "Buscando produtos em:",
      API_URL
    );

    const resposta = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    // Mostra o erro real retornado pelo backend
    if (!resposta.ok) {
      const mensagem = await obterMensagemErro(
        resposta,
        `Erro ao buscar produtos. Código HTTP: ${resposta.status}`
      );

      throw new Error(mensagem);
    }

    const dadosBrutosDoServidor =
      await resposta.json();

    if (!Array.isArray(dadosBrutosDoServidor)) {
      throw new Error(
        "Resposta inválida recebida do servidor."
      );
    }

    const tabela = document.querySelector(
      "#tabela-produtos tbody"
    );

    if (!tabela) {
      console.error(
        "Não foi encontrada a tabela #tabela-produtos tbody."
      );

      return;
    }

    tabela.innerHTML = "";

    let totalAcumulado = 0;

    dadosBrutosDoServidor.forEach((dados) => {
      try {
        const produto = new Produto(
          dados.nome,
          dados.preco,
          dados.quantidade
        );

        totalAcumulado += produto.valorTotal();

        const row =
          document.createElement("tr");

        // Nome
        const tdNome =
          document.createElement("td");

        tdNome.textContent =
          produto.nome;

        // Preço
        const tdPreco =
          document.createElement("td");

        tdPreco.textContent =
          `R$ ${produto.preco.toFixed(2)}`;

        // Quantidade
        const tdQuantidade =
          document.createElement("td");

        tdQuantidade.textContent =
          produto.quantidade;

        // Valor total
        const tdTotal =
          document.createElement("td");

        tdTotal.textContent =
          `R$ ${produto.valorTotal().toFixed(2)}`;

        // Ações
        const tdAcoes =
          document.createElement("td");

        const botao =
          document.createElement("button");

        botao.type = "button";
        botao.textContent = "Apagar";

        botao.addEventListener(
          "click",
          () => deletarProduto(dados.id)
        );

        tdAcoes.appendChild(botao);

        // Monta a linha
        row.appendChild(tdNome);
        row.appendChild(tdPreco);
        row.appendChild(tdQuantidade);
        row.appendChild(tdTotal);
        row.appendChild(tdAcoes);

        tabela.appendChild(row);

      } catch (erro) {
        console.error(
          "Produto inválido recebido do servidor:",
          dados,
          erro
        );
      }
    });

    // Atualiza o valor total
    const elementoTotal =
      document.getElementById(
        "total-estoque"
      );

    if (elementoTotal) {
      elementoTotal.textContent =
        `Total em estoque: R$ ${totalAcumulado.toFixed(2)}`;
    }

  } catch (erro) {
    console.error(
      "Erro ao buscar dados no servidor:",
      erro
    );

    const tabela = document.querySelector(
      "#tabela-produtos tbody"
    );

    if (tabela) {
      tabela.innerHTML = `
        <tr>
          <td colspan="5">
            Erro ao carregar produtos.
          </td>
        </tr>
      `;
    }
  }
}


// ============================================================
// APAGAR UM PRODUTO
// ============================================================

async function deletarProduto(id) {
  const idNumerico = Number(id);

  if (
    !Number.isInteger(idNumerico) ||
    idNumerico <= 0
  ) {
    console.error(
      "ID de produto inválido:",
      id
    );

    return;
  }

  const confirmar =
    confirm(
      "Tem certeza que deseja apagar este produto?"
    );

  if (!confirmar) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/${idNumerico}`,
      {
        method: "DELETE"
      }
    );

    if (!resposta.ok) {
      const mensagem =
        await obterMensagemErro(
          resposta,
          `Erro ao apagar produto. Código HTTP: ${resposta.status}`
        );

      throw new Error(mensagem);
    }

    await renderizarTabela();

  } catch (erro) {
    console.error(
      "Erro ao apagar produto:",
      erro
    );

    alert(
      erro.message ||
      "Não foi possível apagar o produto."
    );
  }
}


// ============================================================
// APAGAR TODOS OS PRODUTOS
// ============================================================

const botaoLimpar =
  document.getElementById(
    "limpar-tabela"
  );

if (botaoLimpar) {
  botaoLimpar.addEventListener(
    "click",
    async function () {

      const confirmar =
        confirm(
          "Tem certeza que deseja apagar TODOS os produtos?"
        );

      if (!confirmar) {
        return;
      }

      try {
        const resposta =
          await fetch(API_URL, {
            method: "DELETE"
          });

        if (!resposta.ok) {
          const mensagem =
            await obterMensagemErro(
              resposta,
              `Erro ao limpar produtos. Código HTTP: ${resposta.status}`
            );

          throw new Error(mensagem);
        }

        await renderizarTabela();

      } catch (erro) {
        console.error(
          "Erro ao limpar dados no servidor:",
          erro
        );

        alert(
          erro.message ||
          "Não foi possível limpar os produtos."
        );
      }
    }
  );
}


// ============================================================
// TESTAR BACKEND
// ============================================================

async function verificarBackend() {
  try {
    const urlHealth =
      window.location.protocol === "file:"
        ? "http://localhost:3000/health"
        : `${window.location.origin}/health`;

    const resposta =
      await fetch(urlHealth, {
        method: "GET",
        cache: "no-store"
      });

    if (!resposta.ok) {
      console.warn(
        "Backend respondeu com erro:",
        resposta.status
      );

      return false;
    }

    const dados =
      await resposta.json();

    console.log(
      "Backend funcionando:",
      dados
    );

    return true;

  } catch (erro) {
    console.error(
      "Backend não está acessível:",
      erro
    );

    return false;
  }
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "Frontend iniciado."
    );

    console.log(
      "API utilizada:",
      API_URL
    );

    await verificarBackend();

    await renderizarTabela();
  }
);

