const api = "http://localhost:5224/api/atividades";
const campo = id => document.getElementById(id);
const formulario = campo("formulario");
let idEdicao = null;

function avisar(texto, cor) {
  campo("mensagem").textContent = texto;
  campo("mensagem").className = "alert alert-" + cor;
}

function requisitar(rota, opcoes) {
  return fetch(api + rota, opcoes).then(resposta => {
    if (!resposta.ok) {
      throw new Error("A API retornou erro " + resposta.status + ".");
    }
    if (resposta.status !== 204) {
      return resposta.json();
    }
  });
}

function mostrarErro(erro) {
  avisar("Confira se a API está rodando. " + erro.message, "danger");
  campo("mensagem").scrollIntoView();
}

function ajustarCampos() {
  const curso = campo("tipo").value === "curso";
  document.querySelector('label[for="responsavel"]').textContent = curso ? "Professor" : "Instrutor";
  document.querySelector('label[for="horas"]').textContent = curso ? "Carga horária (horas)" : "Duração (horas)";
  campo("grupo-local").hidden = curso;
  campo("local").disabled = curso;
  campo("grupo-vagas").hidden = !curso;
  campo("vagas").disabled = !curso;
}

function limpar() {
  idEdicao = null;
  formulario.reset();
  campo("tipo").disabled = false;
  campo("tituloForm").textContent = "Nova atividade";
  campo("cancelar").hidden = true;
  ajustarCampos();
}

function editar(atividade) {
  idEdicao = atividade.id;
  const curso = atividade.professor !== undefined;
  campo("tipo").value = curso ? "curso" : "workshop";
  campo("tipo").disabled = true;
  ajustarCampos();
  campo("titulo").value = atividade.titulo;
  campo("ano").value = atividade.ano;
  campo("responsavel").value = curso ? atividade.professor : atividade.instrutor;
  campo("horas").value = curso ? atividade.cargaHoraria : atividade.duracaoHoras;
  campo("vagas").value = curso ? atividade.vagas : "";
  campo("local").value = curso ? "" : atividade.local;
  campo("tituloForm").textContent = "Editar atividade";
  campo("cancelar").hidden = false;
  campo("titulo").focus();
}

function excluir(atividade, botao) {
  if (confirm('Excluir "' + atividade.titulo + '"?')) {
    botao.disabled = true;
    requisitar("/" + atividade.id, { method: "DELETE" })
      .then(() => {
        if (idEdicao === atividade.id) limpar();
        carregar("Atividade excluída.");
      })
      .catch(mostrarErro)
      .finally(() => { botao.disabled = false; });
  }
}

function mostrarCard(atividade) {
  const coluna = document.createElement("div");
  coluna.className = "col-12 col-md-6";
  coluna.innerHTML = `
    <article class="card card-body h-100">
      <h3 class="h5"></h3>
      <p></p>
      <div>
        <button class="btn btn-outline-primary btn-sm">Editar</button>
        <button class="btn btn-outline-danger btn-sm">Excluir</button>
      </div>
    </article>`;
  coluna.querySelector("h3").textContent = atividade.titulo;
  const curso = atividade.professor !== undefined;
  const detalhes = curso
    ? "Professor: " + atividade.professor + " · " + atividade.cargaHoraria + " h · " + atividade.vagas + " vagas"
    : "Instrutor: " + atividade.instrutor + " · " + atividade.duracaoHoras + " h · " + atividade.local;
  coluna.querySelector("p").textContent = (curso ? "Curso" : "Workshop") + " · " + atividade.ano + " · " + detalhes;
  const botoes = coluna.querySelectorAll("button");
  botoes[0].onclick = () => editar(atividade);
  botoes[1].onclick = () => excluir(atividade, botoes[1]);
  campo("lista").appendChild(coluna);
}

function carregar(mensagem) {
  avisar("Carregando atividades...", "info");
  return requisitar("")
    .then(lista => {
      // A listagem pode trazer só os campos comuns. A consulta por ID traz a ficha completa.
      return Promise.all(lista.map(item => requisitar("/" + item.id)));
    })
    .then(atividades => {
      campo("lista").replaceChildren();
      atividades.forEach(mostrarCard);
      if (atividades.length === 0) campo("lista").textContent = "Nenhuma atividade cadastrada.";
      avisar(mensagem, "success");
    })
    .catch(mostrarErro);
}

formulario.addEventListener("submit", evento => {
  evento.preventDefault();
  const tipo = campo("tipo").value;
  const dados = {
    titulo: campo("titulo").value.trim(),
    ano: Number(campo("ano").value)
  };
  if (tipo === "curso") {
    dados.professor = campo("responsavel").value.trim();
    dados.cargaHoraria = Number(campo("horas").value);
    dados.vagas = Number(campo("vagas").value);
  } else {
    dados.instrutor = campo("responsavel").value.trim();
    dados.duracaoHoras = Number(campo("horas").value);
    dados.local = campo("local").value.trim();
  }

  const editando = idEdicao !== null;
  const rota = "/" + tipo + (editando ? "/" + idEdicao : "");
  campo("salvar").disabled = true;
  requisitar(rota, {
    method: editando ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  })
    .then(() => {
      limpar();
      campo("inicio").scrollIntoView();
      return carregar(editando ? "Atividade atualizada." : "Atividade cadastrada.");
    })
    .catch(mostrarErro)
    .finally(() => { campo("salvar").disabled = false; });
});

campo("tipo").onchange = ajustarCampos;
campo("cancelar").onclick = limpar;
ajustarCampos();
carregar("Lista carregada.");
