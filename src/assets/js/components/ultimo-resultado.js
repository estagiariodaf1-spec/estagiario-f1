/* Box "Último resultado" da capa: top 5 da última corrida, com diferença pro vencedor e volta mais rápida. */
(function (global) {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function curto(r) { return (r.givenName ? r.givenName.charAt(0) + '. ' : '') + r.familyName; }

  async function mount(seletor) {
    var raiz = document.querySelector(seletor);
    if (!raiz || !global.F1Api) return;
    try {
      var dados = await global.F1Api.getLastRaceResults();
      var corrida = dados.race;
      if (!corrida || !corrida.results.length) throw new Error('sem resultado');
      var linhas = corrida.results.slice(0, 5).map(function (r, i) {
        var tempo = i === 0 ? 'Venceu' : (r.time || r.status || '');
        return '<div class="ranking-row"><span><b class="rank-num">' + esc(r.position) + '</b>' + esc(curto(r)) +
          ' <small class="equipe">' + esc(r.team) + '</small></span><span class="ranking-dir"><strong>' + esc(tempo) + '</strong></span></div>';
      }).join('');
      var vmr = corrida.fastestLap && corrida.fastestLap.driver
        ? '<p class="vmr">Volta mais rápida: <b>' + esc(corrida.fastestLap.driver) + '</b> ' + esc(corrida.fastestLap.time) + '</p>' : '';
      raiz.innerHTML = '<p class="ultimo-gp">' + esc(corrida.name) + '</p>' + linhas + vmr;
    } catch (e) {
      raiz.innerHTML = '<p class="standings-status">Não deu pra carregar o último resultado.</p>';
    }
  }
  global.UltimoResultado = { mount: mount };
})(window);
