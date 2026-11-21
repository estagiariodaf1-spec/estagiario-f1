/* Destaques da capa: passam sozinhos a cada 7 s; setas, bolinhas e arrasto pra mudar na mão.
   Para quando o leitor está com o mouse em cima ou a aba está escondida. */
(function () {
  var raiz = document.querySelector("[data-hero]");
  if (!raiz) return;
  var selo = document.querySelector("[data-aovivo-selo]");
  var statusUrl = selo && selo.dataset.status;
  if (!statusUrl) return iniciar();
  // Ao vivo destacado pelo painel: entra como primeiro destaque e fica até a cobertura encerrar
  var tempo = setTimeout(iniciar, 2500), feito = false;
  fetch(statusUrl, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (feito) return;
    clearTimeout(tempo);
    if (d && d.ativo && d.destaque && d.destaque.foto) poeAoVivo(d.destaque);
    iniciar();
  }).catch(function () { if (!feito) { clearTimeout(tempo); iniciar(); } });

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function poeAoVivo(d) {
    var a = document.createElement("a");
    a.className = "hero hero-slide hero-aovivo";
    a.href = "/ao-vivo/";
    a.innerHTML = '<img class="hero-img" src="' + esc(d.foto) + '" alt="" loading="eager">' +
      '<div class="hero-content"><span class="tag tag-aovivo">● Ao vivo</span><h2 class="hero-titulo">' + esc(d.chamada || "Acompanhe em tempo real") + '</h2>' +
      (d.credito ? '<p class="hero-credito">Foto: ' + esc(d.credito) + '</p>' : '') + '<span class="button">Acompanhar agora</span></div>';
    var primeiro = raiz.querySelector(".hero-slide");
    raiz.insertBefore(a, primeiro);
    raiz.querySelectorAll(".hero-slide").forEach(function (s, i) {
      s.classList.toggle("ativo", i === 0);
      s.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      s.tabIndex = i === 0 ? 0 : -1;
    });
    var pontos = raiz.querySelector("[data-hero-pontos]");
    if (pontos) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Ao vivo");
      pontos.insertBefore(b, pontos.firstChild);
      pontos.querySelectorAll("button").forEach(function (x, i) { x.classList.toggle("ativo", i === 0); });
    }
  }

  function iniciar() {
  if (feito) return;
  feito = true;
  var slides = raiz.querySelectorAll(".hero-slide");
  if (slides.length < 2 || !raiz.querySelector("[data-hero-anterior]")) return;
  var pontos = raiz.querySelectorAll("[data-hero-pontos] button");
  var atual = 0, timer = null, INTERVALO = 7000;
  var reduzido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ir(n) {
    atual = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      var ativo = i === atual;
      s.classList.toggle("ativo", ativo);
      s.setAttribute("aria-hidden", ativo ? "false" : "true");
      s.tabIndex = ativo ? 0 : -1;
    });
    pontos.forEach(function (p, i) { p.classList.toggle("ativo", i === atual); });
  }
  function parar() { clearInterval(timer); timer = null; }
  function tocar() { if (!reduzido && !timer) timer = setInterval(function () { ir(atual + 1); }, INTERVALO); }
  function mexeu(n) { ir(n); parar(); tocar(); }

  raiz.querySelector("[data-hero-anterior]").addEventListener("click", function () { mexeu(atual - 1); });
  raiz.querySelector("[data-hero-proxima]").addEventListener("click", function () { mexeu(atual + 1); });
  pontos.forEach(function (p, i) { p.addEventListener("click", function () { mexeu(i); }); });
  raiz.addEventListener("mouseenter", parar);
  raiz.addEventListener("mouseleave", tocar);
  raiz.addEventListener("focusin", parar);
  document.addEventListener("visibilitychange", function () { document.hidden ? parar() : tocar(); });

  var x0 = null, arrastou = false;
  raiz.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; arrastou = false; }, { passive: true });
  raiz.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { arrastou = true; mexeu(dx < 0 ? atual + 1 : atual - 1); }
    x0 = null;
  });
  raiz.addEventListener("click", function (e) { if (arrastou) { e.preventDefault(); arrastou = false; } }, true);
  tocar();
  }
})();
