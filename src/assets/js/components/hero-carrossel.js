/* Destaques da capa: passam sozinhos a cada 7 s; setas, bolinhas e arrasto pra mudar na mão.
   Para quando o leitor está com o mouse em cima ou a aba está escondida. */
(function () {
  var raiz = document.querySelector("[data-hero]");
  if (!raiz) return;
  var slides = raiz.querySelectorAll(".hero-slide");
  if (slides.length < 2) return;
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
})();
