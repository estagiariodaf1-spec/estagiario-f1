/* Faixa do fim de semana de GP na capa: muda sozinha com o momento.
   Antes do GP: todos os horários em Brasília e contagem. Durante: sessão ao vivo / próxima sessão.
   Depois da corrida: já pula para o próximo GP (o resultado fica no card "Último resultado" da capa).
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
  // bandeira do país do GP ao lado do nome (arquivo em /assets/bandeiras)
  function bandeira(corrida) {
    var pais = corrida && corrida.Circuit && corrida.Circuit.Location && corrida.Circuit.Location.country;
    var codigo = pais && global.F1Api && global.F1Api.bandeira ? global.F1Api.bandeira(pais) : '';
    return codigo ? '<img class="gp-bandeira" src="/assets/bandeiras/' + codigo + '.svg" alt="" width="24" height="18" decoding="async">' : '';
  }
  function nome(n) { return global.F1Api && global.F1Api.nomeGP ? global.F1Api.nomeGP(n) : n; }
  // usa o mesmo buscador do resto do site (guarda 10 min, tenta de novo e cai na cópia do build se a API falhar)
  async function json(url) {
    if (global.F1Api && global.F1Api.fetchJson) return global.F1Api.fetchJson(url);
    var r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json();
  }

  function sessoes(corrida) {
    var lista = SESSOES.map(function (s) {
      var ini = data(corrida[s[0]]);
      return ini && { nome: s[1], ini: ini, fim: new Date(ini.getTime() + s[2] * 60e3) };
    }).filter(Boolean);
    var largada = data(corrida);
    lista.push({ nome: 'Corrida', ini: largada, fim: new Date(largada.getTime() + 2 * HORA), corrida: true });
    return lista.sort(function (a, b) { return a.ini - b.ini; });
  }

  // Qual sessão fica acesa: na semana, a corrida; a partir da 0h (Brasília) do dia do primeiro treino,
  // a sessão que está rolando ou a próxima (TL1, TL2, TL3, classificação, corrida).
  function meiaNoite(d) {
    var dia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return new Date(dia + 'T00:00:00-03:00');
  }
  function acesa(lista, agora) {
    if (agora < meiaNoite(lista[0].ini)) return lista.length - 1;
    for (var i = 0; i < lista.length; i++) if (agora < lista[i].fim) return i;
    return -1;
  }

  function chips(lista, agora, link) {
    var luz = acesa(lista, agora);
    return '<ol class="gp-sessoes">' + lista.map(function (s, i) {
      var estado = agora >= s.fim ? 'feita' : (agora >= s.ini ? 'agora' : (i === luz ? 'destaque' : ''));
      if (estado === 'agora') {  // a sessão que está rolando: leva pro Ao vivo
        return '<li class="agora' + (s.corrida ? ' corrida' : '') + '"><a href="' + esc(link || '/ao-vivo/') + '"><span>' + esc(s.nome) +
          '</span><b>Ao vivo agora</b></a></li>';
      }
      return '<li class="' + estado + (s.corrida ? ' corrida' : '') + '"><span>' + esc(s.nome) + '</span><b>' + esc(diaHora(s.ini)) + '</b></li>';
    }).join('') + '</ol>';
  }

  function falta(ms) {
    var d = Math.floor(ms / DIA), h = Math.floor((ms % DIA) / HORA);
    return d > 0 ? d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + 'h' : '') : (h > 0 ? h + 'h' : 'menos de 1h');
  }

  // Barrinha que gruda embaixo do cabeçalho quando a faixa sai da tela (como no site da F1):
  // bandeira, GP, a sessão da vez e a contagem regressiva (ou "Ao vivo").
  var CURTO = { 'Treino livre 1': 'TL1', 'Treino livre 2': 'TL2', 'Treino livre 3': 'TL3', 'Classificação sprint': 'Quali sprint',
    'Sprint': 'Sprint', 'Classificação': 'Quali', 'Corrida': 'Corrida' };
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function contagem(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
      m = Math.floor(s % 3600 / 60), seg = s % 60;
    return d > 0 ? '<b>' + d + '</b>d <b>' + dois(h) + '</b>h <b>' + dois(m) + '</b>m'
      : '<b>' + dois(h) + '</b>h <b>' + dois(m) + '</b>m <b>' + dois(seg) + '</b>s';
  }
  var relogio = null;
  function mini(corrida, lista, link, deslocamento) {
    var cabecalho = document.querySelector('header.header'), faixa = document.querySelector('[data-gp-faixa]');
    if (!cabecalho || !faixa) return;
    var trilho = document.querySelector('.gp-mini-trilho');
    if (!trilho) {
      trilho = document.createElement('div');
      trilho.className = 'gp-mini-trilho';
      cabecalho.insertAdjacentElement('afterend', trilho);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (itens) {
          document.documentElement.classList.toggle('faixa-fora', !itens[0].isIntersecting);
        }, { rootMargin: '-80px 0px 0px 0px' }).observe(faixa);
      }
    }
    function desenhar() {
      var agora = new Date(Date.now() + deslocamento);
      var atual = lista.find(function (s) { return agora >= s.ini && agora < s.fim; });
      var prox = lista.find(function (s) { return s.ini > agora; });
      if (!atual && !prox) { trilho.innerHTML = ''; clearInterval(relogio); return; }
      var s = atual || prox;
      trilho.innerHTML = '<a class="gp-mini" href="' + esc(atual ? link : (agora >= lista[0].ini ? link : '/gp.html')) + '">' +
        '<span class="gp-mini-gp">' + bandeira(corrida) + esc(nome(corrida.raceName).replace(/^GP (do |da |de |dos |das )?/, '')) + ' ›</span>' +
        '<span class="gp-mini-sessao">' + esc(CURTO[s.nome] || s.nome) + '</span>' +
        (atual ? '<span class="gp-mini-vivo">Ao vivo</span>' : '<span class="gp-mini-conta">' + contagem(s.ini - agora) + '</span>') + '</a>';
    }
    desenhar();
    clearInterval(relogio);
    relogio = setInterval(desenhar, 1000);
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

      if (!corrida) { raiz.innerHTML = '<div class="gp-faixa longe"><div class="gp-titulo"><span class="gp-tag">Temporada</span><strong>Calendário da F1</strong><em>Horários de Brasília</em></div><a class="gp-link" href="/calendario.html">Ver calendário ›</a></div>'; return; }

      var lista = sessoes(corrida);
      mini(corrida, lista, linkAoVivo, agora.getTime() - Date.now());
      var primeira = lista[0].ini, ultima = lista[lista.length - 1].fim;
      var titulo = bandeira(corrida) + esc(nome(corrida.raceName));
      if (agora >= primeira && agora < ultima) {
        var atual = lista.find(function (s) { return agora >= s.ini && agora < s.fim; });
        var prox = lista.find(function (s) { return s.ini > agora; });
        var chamada = atual ? '<span class="gp-tag vivo">Ao vivo</span><strong>' + esc(atual.nome) + ' · ' + titulo + '</strong>'
          : '<span class="gp-tag">Fim de semana de GP</span><strong>' + titulo + '</strong>' +
            (prox ? '<em>Próxima: ' + esc(prox.nome) + ' em ' + falta(prox.ini - agora) + '</em>' : '');
        raiz.innerHTML = '<div class="gp-faixa durante"><div class="gp-titulo">' + chamada + '</div>' + chips(lista, agora, linkAoVivo) +
          '<a class="gp-link" href="' + linkAoVivo + '">Ao vivo do Estagiário ›</a></div>';
        // no celular, rola as sessões até a que importa agora
        var trilho = raiz.querySelector('.gp-sessoes'), alvo = raiz.querySelector('.gp-sessoes .agora') || raiz.querySelector('.gp-sessoes .destaque') ||
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
        chips(lista, agora, linkAoVivo) + '<a class="gp-link" href="/gp.html">Central do GP ›</a></div>';
    } catch (e) {
      // sem dados, mantém a faixa (sumir com ela empurraria a página)
      raiz.innerHTML = '<div class="gp-faixa longe"><div class="gp-titulo"><span class="gp-tag">Temporada</span><strong>Calendário da F1</strong><em>Horários de Brasília</em></div><a class="gp-link" href="/calendario.html">Ver calendário ›</a></div>';
    }
  }
  global.GPFimDeSemana = { mount: mount };
})(window);
