/* Selo "Ao vivo" do cabeçalho: apagado (cinza) quando não tem cobertura; vermelho piscando quando tem.
   Pergunta pro robô no máximo uma vez por minuto por visitante (guarda a resposta na sessão). */
(function () {
  var selo = document.querySelector("[data-aovivo-selo]");
  if (!selo || !selo.dataset.status) return;
  function aplicar(d) {
    selo.classList.toggle("no-ar", !!d.ativo);
    selo.title = d.ativo ? "No ar agora" + (d.titulo ? ": " + d.titulo : "") : "Nenhuma cobertura ao vivo agora";
  }
  try {
    var guardado = JSON.parse(sessionStorage.getItem("aovivo-status") || "null");
    if (guardado && Date.now() - guardado.em < 60000) return aplicar(guardado);
  } catch (e) {}
  fetch(selo.dataset.status, { cache: "default" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    aplicar(d);
    try { sessionStorage.setItem("aovivo-status", JSON.stringify({ ativo: !!d.ativo, titulo: d.titulo || "", em: Date.now() })); } catch (e) {}
  }).catch(function () {});
})();
