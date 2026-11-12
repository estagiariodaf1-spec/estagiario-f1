/* Box "Último resultado" da capa: GP com bandeira em destaque, top 5 e, no clique, o resultado completo. */
(function (global) {
  'use strict';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function curto(r) { return (r.givenName ? r.givenName.charAt(0) + '. ' : '') + r.familyName; }
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function situacao(r, i) {
    if (i === 0) return 'Venceu';
    if (r.time) return r.time;
    var s = r.status || '', m = s.match(/^\+(\d+) Laps?$/);
    if (m) return '+' + m[1] + (m[1] === '1' ? ' volta' : ' voltas');
    if (/lapped/i.test(s)) return '+1 volta';
    if (/disqualified/i.test(s)) return 'Desclassificado';
    if (/did not start|withdrew/i.test(s)) return 'Não largou';
    if (/finished/i.test(s)) return 'Terminou';
    return 'Abandonou';
  }

  function linha(r, i) {
    var n = Number(r.points) || 0;
    var pts = '<small class="pts">' + (n > 0 ? esc(r.points) + (n === 1 ? ' pt' : ' pts') : '') + '</small>';
    return '<div class="ranking-row' + (i >= 5 ? ' resto' : '') + '"><span><b class="rank-num">' + esc(r.position) + '</b>' + esc(curto(r)) +
      ' <small class="equipe">' + esc(r.team) + '</small></span><span class="ranking-dir"><strong>' + esc(situacao(r, i)) + '</strong>' + pts + '</span></div>';
  }

  async function mount(seletor) {
    var raiz = document.querySelector(seletor);
    if (!raiz || !global.F1Api) return;
    try {
      var dados = await global.F1Api.getLastRaceResults();
      var corrida = dados.race;
      if (!corrida || !corrida.results.length) throw new Error('sem resultado');
      var bandeira = global.F1Api.bandeira ? global.F1Api.bandeira(corrida.countryEn) : '';
      var quando = '';
      if (corrida.date) {
        var d = new Date(corrida.date + 'T' + (corrida.time || '12:00:00Z'));
        quando = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
      }
      var topo = '<div class="ultimo-gp">' + (bandeira ? '<img src="/assets/bandeiras/' + bandeira + '.svg" alt="" width="34" height="34">' : '') +
        '<div><b>' + esc(corrida.name) + '</b><small>' + esc([quando, corrida.locality].filter(Boolean).join(' · ')) + '</small></div></div>';
      var vmr = corrida.fastestLap && corrida.fastestLap.driver
        ? '<p class="vmr">Volta mais rápida: <b>' + esc(corrida.fastestLap.driver) + '</b> ' + esc(corrida.fastestLap.time) + '</p>' : '';
      var resto = corrida.results.length > 5
        ? '<button type="button" class="link-class-full" data-ver-tudo>Resultado completo ›</button>' : '';
      raiz.innerHTML = topo + '<div class="lista-resultado">' + corrida.results.map(linha).join('') + '</div>' + vmr + resto;
      var botao = raiz.querySelector('[data-ver-tudo]');
      if (botao) botao.addEventListener('click', function () {
        var aberto = raiz.classList.toggle('aberto');
        botao.textContent = aberto ? 'Mostrar só o top 5 ‹' : 'Resultado completo ›';
      });
    } catch (e) {
      raiz.innerHTML = '<p class="standings-status">Não deu pra carregar o último resultado.</p>';
    }
  }
  global.UltimoResultado = { mount: mount };
})(window);
