/* Faixa do fim de semana de GP na capa: muda sozinha com o momento.
   Antes do GP: todos os horários em Brasília e contagem. Durante: sessão ao vivo / próxima sessão.
   Depois da corrida (até 2 dias): pódio. Fora disso: só o próximo GP.
   Para testar outro momento: ?agora=2026-11-07T15:00:00-03:00 */
(function (global) {
  'use strict';
  var BASE = 'https://api.jolpi.ca/ergast/f1/';
  var FUSO = 'America/Sao_Paulo';
  var SESSOES = [
    ['FirstPractice', 'Treino livre 1', 60], ['SecondPractice', 'Treino livre 2', 60],
    ['ThirdPractice', 'Treino livre 3', 60], ['SprintQualifying', 'Classificação sprint', 45],
    ['Sprint', 'Sprint', 45], ['Qualifying', 'Classificação', 60]
  ];
  var HORA = 3600e3, DIA = 24 * HORA;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function quando(d, opcoes) { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: FUSO }, opcoes)).format(d); }
  function diaHora(d) {
    var dia = quando(d, { weekday: 'short' }).replace('.', '');
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ' ' + quando(d, { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
  }
  function data(o) { return o && o.date ? new Date(o.date + 'T' + (o.time || '00:00:00Z')) : null; }
  function nome(n) { return global.F1Api && global.F1Api.nomeGP ? global.F1Api.nomeGP(n) : n; }
  async function json(url) { var r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }

  function sessoes(corrida) {
    var lista = SESSOES.map(function (s) {
      var ini = data(corrida[s[0]]);
      return ini && { nome: s[1], ini: ini, fim: new Date(ini.getTime() + s[2] * 60e3) };
    }).filter(Boolean);
    var largada = data(corrida);
    lista.push({ nome: 'Corrida', ini: largada, fim: new Date(largada.getTime() + 2 * HORA), corrida: true });
    return lista.sort(function (a, b) { return a.ini - b.ini; });
  }

  function chips(lista, agora) {
    return '<ol class="gp-sessoes">' + lista.map(function (s) {
      var estado = agora >= s.fim ? 'feita' : (agora >= s.ini ? 'agora' : '');
      return '<li class="' + estado + (s.corrida ? ' corrida' : '') + '"><span>' + esc(s.nome) + '</span><b>' +
        (estado === 'agora' ? 'AO VIVO' : esc(diaHora(s.ini))) + '</b></li>';
    }).join('') + '</ol>';
  }

  function falta(ms) {
    var d = Math.floor(ms / DIA), h = Math.floor((ms % DIA) / HORA);
    return d > 0 ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + 'h' : '') : (h > 0 ? h + 'h' : 'menos de 1h');
  }

  async function mount(seletor, opcoes) {
    var raiz = document.querySelector(seletor || '[data-gp-faixa]');
    if (!raiz) return;
    var linkAoVivo = (opcoes && opcoes.aoVivo) || '/ao-vivo/';
    var teste = new URLSearchParams(location.search).get('agora');
    var agora = teste ? new Date(teste) : new Date();
    try {
      var proximo = await json(BASE + 'current/next.json').catch(function () { return null; });
      var ultimo = await json(BASE + 'current/last/results.json').catch(function () { return null; });
      var corrida = proximo && proximo.MRData.RaceTable.Races[0];
      var passada = ultimo && ultimo.MRData.RaceTable.Races[0];
      if (teste && passada && corrida && data(passada) > agora) { corrida = passada; passada = null; } // teste no passado

      var fimPassada = passada && new Date(data(passada).getTime() + 2 * HORA);
      if (passada && agora >= fimPassada && agora - fimPassada < 2 * DIA && (!corrida || data(corrida) - agora > 3 * DIA)) {
        var podio = (passada.Results || []).slice(0, 3).map(function (r, i) {
          return '<li><b>' + (i + 1) + 'º</b> ' + esc(r.Driver.givenName.charAt(0) + '. ' + r.Driver.familyName) +
            ' <small>' + esc(r.Constructor.name) + '</small></li>';
        }).join('');
        raiz.innerHTML = '<div class="gp-faixa pos"><div class="gp-titulo"><span class="gp-tag">Deu bandeirada</span><strong>' +
          esc(nome(passada.raceName)) + '</strong></div><ol class="gp-podio">' + podio + '</ol>' +
          '<a class="gp-link" href="/noticias/">Análise e repercussão ›</a></div>';
        return;
      }
      if (!corrida) { raiz.innerHTML = '<div class="gp-faixa longe"><div class="gp-titulo"><span class="gp-tag">Temporada</span><strong>Calendário da F1</strong><em>Horários de Brasília</em></div><a class="gp-link" href="/calendario.html">Ver calendário ›</a></div>'; return; }

      var lista = sessoes(corrida);
      var primeira = lista[0].ini, ultima = lista[lista.length - 1].fim;
      var titulo = esc(nome(corrida.raceName));
      if (agora >= primeira && agora < ultima) {
        var atual = lista.find(function (s) { return agora >= s.ini && agora < s.fim; });
        var prox = lista.find(function (s) { return s.ini > agora; });
        var chamada = atual ? '<span class="gp-tag vivo">Ao vivo</span><strong>' + esc(atual.nome) + ' · ' + titulo + '</strong>'
          : '<span class="gp-tag">Fim de semana de GP</span><strong>' + titulo + '</strong>' +
            (prox ? '<em>Próxima: ' + esc(prox.nome) + ' em ' + falta(prox.ini - agora) + '</em>' : '');
        raiz.innerHTML = '<div class="gp-faixa durante"><div class="gp-titulo">' + chamada + '</div>' + chips(lista, agora) +
          '<a class="gp-link" href="' + linkAoVivo + '">Ao vivo do Estagiário ›</a></div>';
        // no celular, rola as sessões até a que importa agora
        var trilho = raiz.querySelector('.gp-sessoes'), alvo = raiz.querySelector('.gp-sessoes .agora') ||
          Array.prototype.find.call(raiz.querySelectorAll('.gp-sessoes li'), function (li) { return !li.classList.contains('feita'); });
        if (trilho && alvo) trilho.scrollLeft = Math.max(0, alvo.offsetLeft - trilho.offsetLeft - 8);
        return;
      }
      var dias = (primeira - agora) / DIA;
      var cabecalho = dias <= 7
        ? '<span class="gp-tag">Semana de GP</span><strong>' + titulo + '</strong><em>Começa em ' + falta(primeira - agora) + ' · horários de Brasília</em>'
        : '<span class="gp-tag">Próximo GP</span><strong>' + titulo + '</strong><em>Corrida: ' + esc(quando(data(corrida), { weekday: 'short' }).replace('.', '')) + ' ' +
          esc(quando(data(corrida), { day: '2-digit', month: '2-digit' })) + ', ' +
          esc(quando(data(corrida), { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h')) + ' (Brasília) · ' +
          esc(corrida.Circuit.circuitName) + ' · faltam ' + falta(data(corrida) - agora) + '</em>';
      raiz.innerHTML = '<div class="gp-faixa ' + (dias <= 7 ? 'semana' : 'longe') + '"><div class="gp-titulo">' + cabecalho + '</div>' +
        chips(lista, agora) + '<a class="gp-link" href="/gp.html">Central do GP ›</a></div>';
    } catch (e) {
      // sem dados, mantém a faixa (sumir com ela empurraria a página)
      raiz.innerHTML = '<div class="gp-faixa longe"><div class="gp-titulo"><span class="gp-tag">Temporada</span><strong>Calendário da F1</strong><em>Horários de Brasília</em></div><a class="gp-link" href="/calendario.html">Ver calendário ›</a></div>';
    }
  }
  global.GPFimDeSemana = { mount: mount };
})(window);
