/* Selo "Ao vivo" do cabeçalho: apagado (cinza) quando não tem cobertura; vermelho aceso e pulsando quando tem.
   Vale para o Ao vivo aberto à mão (minuto a minuto) e para os dados de pista ligados.
   Marca também <html class="aovivo-no-ar"> para o resto da página (o card do GP na capa) acender junto.
   Pergunta pro robô a cada 45 segundos com a aba aberta (guarda a resposta na sessão por 30 s). */
(function () {
  var selo = document.querySelector("[data-aovivo-selo]");
  if (!selo || !selo.dataset.status) return;
  function aplicar(d) {
    selo.classList.toggle("no-ar", !!d.ativo);
    document.documentElement.classList.toggle("aovivo-no-ar", !!d.ativo);
    selo.title = d.ativo ? "No ar agora" + (d.titulo ? ": " + d.titulo : "") : "Nenhuma cobertura ao vivo agora";
  }
  function checar() {
    try {
      var guardado = JSON.parse(sessionStorage.getItem("aovivo-status") || "null");
      if (guardado && Date.now() - guardado.em < 30000) return aplicar(guardado);
    } catch (e) {}
    fetch(selo.dataset.status, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      aplicar(d);
      try { sessionStorage.setItem("aovivo-status", JSON.stringify({ ativo: !!d.ativo, titulo: d.titulo || "", em: Date.now() })); } catch (e) {}
    }).catch(function () {});
  }
  checar();
  setInterval(function () { if (!document.hidden) checar(); }, 45000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checar(); });
})();
