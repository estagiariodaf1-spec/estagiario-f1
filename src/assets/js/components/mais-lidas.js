/* Mais lidas da semana: o robô conta leitores de verdade (sem cookie; quem saiu em menos de 5 s não conta)
   e o site completa com o título. Sem dados suficientes (menos de 3), o bloco não aparece. */
(function () {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function json(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  window.MaisLidas = {
    mount: function (seletor, urlRobo, opcoes) {
      var raiz = document.querySelector(seletor);
      if (!raiz || !urlRobo) return;
      var quantas = (opcoes && opcoes.quantas) || 5, fora = (opcoes && opcoes.tirando) || '';
      Promise.all([json(urlRobo), json('/dados/materias-indice.json')]).then(function (r) {
        var indice = {};
        r[1].forEach(function (m) { indice[m.url] = m; });
        var lista = (r[0].materias || []).map(function (x) { return indice[x.url]; })
          .filter(function (m) { return m && m.url !== fora; }).slice(0, quantas);
        if (lista.length < 3) return;
        raiz.innerHTML = '<div class="section-head"><h2 class="section-title">Mais lidas da semana</h2></div><ol class="mais-lidas">' +
          lista.map(function (m, i) {
            return '<li><a href="' + esc(m.url) + '"><span class="ml-num">' + (i + 1) + '</span><span class="ml-tit">' + esc(m.titulo) + '</span></a></li>';
          }).join('') + '</ol>';
        raiz.hidden = false;
      }).catch(function () {});
    }
  };
})();
