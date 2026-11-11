/* Vitrine das redes na capa: lê os últimos posts que o robô da redação guarda e passa um a um.
   Se não houver posts (ou o robô não responder), o box mostra só o convite para seguir. */
(function (global) {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function montarCarrossel(caixa, posts) {
    var trilho = caixa.querySelector('[data-trilho]');
    var pontos = caixa.querySelector('[data-pontos]');
    trilho.innerHTML = posts.map(function (p) {
      return '<a class="vitrine-item" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
        '<span class="vitrine-foto"><img src="' + esc(p.imagem) + '" alt="" loading="lazy">' +
          (p.video ? '<span class="vitrine-play" aria-hidden="true">▶</span>' : '') + '</span>' +
        (p.legenda ? '<span class="vitrine-legenda">' + esc(p.legenda) + '</span>' : '') +
      '</a>';
    }).join('');
    pontos.innerHTML = posts.map(function (_, i) {
      return '<button type="button" aria-label="Post ' + (i + 1) + '"' + (i === 0 ? ' class="ativo"' : '') + '></button>';
    }).join('');

    var atual = 0;
    var botoes = pontos.querySelectorAll('button');
    function ir(i) {
      atual = (i + posts.length) % posts.length;
      trilho.style.transform = 'translateX(' + (-100 * atual) + '%)';
      botoes.forEach(function (b, j) { b.classList.toggle('ativo', j === atual); });
    }
    botoes.forEach(function (b, i) { b.addEventListener('click', function () { ir(i); reiniciar(); }); });
    var relogio;
    function reiniciar() { clearInterval(relogio); relogio = setInterval(function () { ir(atual + 1); }, 5000); }
    caixa.addEventListener('mouseenter', function () { clearInterval(relogio); });
    caixa.addEventListener('mouseleave', reiniciar);

    // setas para avançar e voltar na hora
    var janela = caixa.querySelector('.vitrine-janela');
    [['anterior', '‹', -1], ['proximo', '›', 1]].forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vitrine-seta vitrine-seta-' + s[0];
      b.setAttribute('aria-label', s[2] < 0 ? 'Post anterior' : 'Próximo post');
      b.textContent = s[1];
      b.addEventListener('click', function (e) { e.preventDefault(); ir(atual + s[2]); reiniciar(); });
      janela.appendChild(b);
    });

    // no celular: arrastar com o dedo
    var inicioX = null;
    janela.addEventListener('touchstart', function (e) { inicioX = e.touches[0].clientX; clearInterval(relogio); }, { passive: true });
    janela.addEventListener('touchend', function (e) {
      if (inicioX === null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
      inicioX = null;
      reiniciar();
    });
    reiniciar();
    caixa.classList.add('com-posts');
  }

  function mount(url) {
    var caixas = document.querySelectorAll('[data-vitrine]');
    if (!caixas.length || !url) return;
    fetch(url).then(function (r) { return r.ok ? r.json() : {}; }).then(function (dados) {
      caixas.forEach(function (caixa) {
        var posts = (dados && dados[caixa.getAttribute('data-vitrine')]) || [];
        if (posts.length) montarCarrossel(caixa, posts.slice(0, 5));
      });
    }).catch(function () { /* fica o convite para seguir */ });
  }

  global.VitrineRedes = { mount: mount };
})(window);
