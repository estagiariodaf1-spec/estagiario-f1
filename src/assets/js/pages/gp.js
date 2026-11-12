/* Central do GP: o próximo GP num lugar só. Horários vêm da própria base (todas as sessões, sprint inclusa),
   ficha do circuito só com dado conferido, classificação, última corrida e as nossas matérias de verdade.
   Para testar outro momento: ?agora=2026-11-21T22:00:00-03:00 */
(function () {
  'use strict';

  var HORA = 3600e3, DIA = 24 * HORA;
  var state = { race: null, alvo: null };
  var teste = new URLSearchParams(location.search).get('agora');
  function agora() { return teste ? new Date(teste) : new Date(); }

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function fmt(d, tz, opcoes) { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: tz || 'America/Sao_Paulo' }, opcoes)).format(d); }
  function hora(d, tz) { return fmt(d, tz, { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h'); }
  function diaSemana(d, tz) {
    var s = fmt(d, tz, { weekday: 'long' }).replace('-feira', '');
    return s.charAt(0).toUpperCase() + s.slice(1) + ', ' + fmt(d, tz, { day: '2-digit', month: '2-digit' });
  }
  function falta(ms) {
    var d = Math.floor(ms / DIA), h = Math.floor((ms % DIA) / HORA), m = Math.floor((ms % HORA) / 60e3);
    if (d > 0) return d + (d === 1 ? ' dia' : ' dias') + (h ? ' e ' + h + 'h' : '');
    if (h > 0) return h + 'h' + (m ? String(m).padStart(2, '0') : '');
    return m + ' min';
  }
  function circuito(id) { return (window.F1CircuitDetails && window.F1CircuitDetails[id]) || {}; }

  function sessaoAtual(lista, t) {
    return lista.find(function (s) { return t >= s.inicio && t < new Date(s.inicio.getTime() + s.minutos * 60e3); });
  }

  function renderHero(race) {
    var codigo = window.F1Api.bandeira(race.countryEn);
    $('gp-hero-flag').innerHTML = codigo ? '<img src="/assets/bandeiras/' + codigo + '.svg" alt="" width="64" height="48" decoding="async">' : '';
    $('gp-hero-title').textContent = race.name;
    $('gp-hero-sub').textContent = [race.circuit, [race.locality, race.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
    var largada = race.sessions.length ? race.sessions[race.sessions.length - 1].inicio : null;
    $('gp-hero-date').textContent = largada ? 'Corrida: ' + diaSemana(largada) + ', ' + hora(largada) + ' (Brasília)' : '';
    var t = agora(), primeira = race.sessions[0] && race.sessions[0].inicio;
    var status = $('gp-status');
    var vivo = sessaoAtual(race.sessions, t);
    if (vivo) {
      status.textContent = 'Ao vivo: ' + vivo.label; status.className = 'gp-status gp-status--live'; status.hidden = false;
      $('gp-hero-actions').insertAdjacentHTML('beforeend', '<a href="/ao-vivo/" class="gp-btn gp-btn--ghost">Ao vivo do Estagiário</a>');
    } else if (primeira && t >= primeira) {
      status.textContent = 'Fim de semana de GP'; status.className = 'gp-status gp-status--live'; status.hidden = false;
      $('gp-hero-actions').insertAdjacentHTML('beforeend', '<a href="/ao-vivo/" class="gp-btn gp-btn--ghost">Ao vivo do Estagiário</a>');
    }
    var prox = race.sessions.find(function (s) { return s.inicio > t; });
    state.alvo = prox || null;
    contagem();
  }

  function contagem() {
    var el = $('gp-countdown');
    if (!el) return;
    if (!state.alvo) { el.textContent = ''; return; }
    var ms = state.alvo.inicio - agora();
    el.textContent = ms > 0 ? state.alvo.label + ' em ' + falta(ms) : '';
  }

  function renderHorarios(race) {
    var root = $('gp-schedule');
    var tz = $('gp-timezone').value || 'America/Sao_Paulo';
    var t = agora();
    if (!race.sessions.length) { root.innerHTML = '<div class="gp-error">Horários ainda não divulgados.</div>'; return; }
    var dias = [], porDia = {};
    race.sessions.forEach(function (s) {
      var dia = diaSemana(s.inicio, tz);
      if (!porDia[dia]) { porDia[dia] = []; dias.push(dia); }
      porDia[dia].push(s);
    });
    root.innerHTML = dias.map(function (dia) {
      return '<h3 class="gp-dia">' + esc(dia) + '</h3>' + porDia[dia].map(function (s) {
        var fim = new Date(s.inicio.getTime() + s.minutos * 60e3);
        var estado = t >= fim ? ' gp-session--feita' : (t >= s.inicio ? ' gp-session--agora' : '');
        return '<article class="gp-session' + (s.corrida ? ' gp-session--race' : '') + estado + '">' +
          '<span class="gp-session-tag">' + esc(s.sigla) + '</span>' +
          '<p class="gp-session-name">' + esc(s.label) + (estado === ' gp-session--agora' ? ' <b class="gp-agora">ao vivo</b>' : '') + '</p>' +
          '<span class="gp-session-time">' + esc(hora(s.inicio, tz)) + '</span></article>';
      }).join('');
    }).join('');
  }

  function cartao(rotulo, valor) {
    return valor ? '<div class="gp-stat-card"><span>' + esc(rotulo) + '</span><strong>' + esc(valor) + '</strong></div>' : '';
  }

  function renderCircuito(race) {
    var d = circuito(race.circuitId);
    $('gp-circuit').innerHTML = '<div class="gp-circuit-stats">' +
      cartao('Circuito', race.circuit) + cartao('Cidade', [race.locality, race.country].filter(Boolean).join(', ')) +
      cartao('Extensão', d.lengthKm) + cartao('Voltas', d.laps) + cartao('Distância', d.raceDistance) +
      cartao('Primeiro GP', d.firstGp) + cartao('Recorde da pista', d.lapRecord) + '</div>';
  }

  function linhas(lista, tipo) {
    if (!lista.length) return '<p class="gp-error">Sem dados agora.</p>';
    var lider = parseFloat(lista[0].points) || 0;
    return lista.slice(0, 5).map(function (r) {
      var gap = r.position === '1' ? 'Líder' : '-' + (lider - (parseFloat(r.points) || 0)) + ' pts';
      return '<div class="gp-standing-row"><span class="gp-standing-pos">' + esc(r.position) + '</span><div>' +
        '<p class="gp-standing-name">' + esc(r.name) + '</p>' +
        (tipo === 'piloto' ? '<p class="gp-standing-team">' + esc(r.team) + '</p>' : '') + '</div>' +
        '<div class="gp-standing-pts">' + esc(r.points) + ' pts<span class="gp-standing-gap">' + esc(gap) + '</span></div></div>';
    }).join('');
  }

  function renderClassificacao(pilotos, equipes) {
    $('gp-standings').innerHTML = '<div class="gp-standings-col"><h3>Pilotos</h3>' + linhas(pilotos, 'piloto') + '</div>' +
      '<div class="gp-standings-col"><h3>Equipes</h3>' + linhas(equipes, 'equipe') + '</div>';
  }

  function renderUltima(payload) {
    var race = payload && payload.race;
    var root = $('gp-last-result');
    if (!race || !race.podium || !race.podium.length) { root.innerHTML = '<div class="gp-error">Resultado indisponível agora.</div>'; return; }
    root.innerHTML = '<p class="gp-next-meta">' + esc(race.name) + '</p><div class="gp-podium">' + race.podium.map(function (r, i) {
      return '<div class="gp-podium-card' + (i === 0 ? ' gp-podium-card--1' : '') + '"><p class="gp-podium-pos">' + esc(r.position) + 'º</p>' +
        '<p class="gp-podium-name">' + esc(r.name) + '</p><p class="gp-podium-team">' + esc(r.team) + '</p></div>';
    }).join('') + '</div>';
  }

  // Matérias nossas: primeiro as que falam deste GP (país, cidade, circuito); se não tiver, as mais recentes.
  function renderMaterias(race) {
    var root = $('gp-editorial');
    var todas = [];
    try { todas = JSON.parse(($('gp-materias') || {}).textContent || '[]'); } catch (e) { todas = []; }
    if (!todas.length) { root.innerHTML = '<div class="gp-error">As matérias do fim de semana aparecem aqui.</div>'; return; }
    var norm = window.F1Api.utils.normalize;
    var chaves = [];
    if (race) {
      chaves = [race.country, race.locality, race.name.replace(/^GP (d[aoe]s? )?/, '')].concat(
        race.circuitId === 'vegas' ? ['Las Vegas'] : [], race.circuitId === 'interlagos' ? ['Interlagos', 'São Paulo'] : []
      ).filter(function (k) { return k && k.length > 3; }).map(norm);
    }
    var desde = race && race.sessions.length ? race.sessions[0].inicio.getTime() - 10 * DIA : 0;
    var doGp = todas.filter(function (m) {
      var texto = norm(m.t + ' ' + m.k + ' ' + m.l);
      return new Date(m.d).getTime() >= desde && chaves.some(function (k) { return texto.indexOf(k) >= 0; });
    });
    var lista = (doGp.length ? doGp : todas).slice(0, 6);
    $('editorial-heading').textContent = doGp.length && race ? 'Matérias do ' + race.name : 'Últimas do Estagiário';
    root.innerHTML = lista.map(function (m) {
      return '<a class="gp-article-card" href="' + esc(m.u) + '">' +
        (m.i ? '<img class="gp-article-visual" src="' + esc(m.i) + '" alt="" loading="lazy">' : '<div class="gp-article-visual"></div>') +
        '<div class="gp-article-body"><h3 class="gp-article-title">' + esc(m.t) + '</h3></div></a>';
    }).join('');
  }

  function abas() {
    var tabs = document.querySelectorAll('.gp-tab');
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        tabs.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-tab') === e.target.id); });
      });
    }, { rootMargin: '-30% 0px -55% 0px' });
    document.querySelectorAll('.gp-panel[id]').forEach(function (s) { obs.observe(s); });
  }

  async function init() {
    abas();
    $('gp-timezone').addEventListener('change', function () { if (state.race) renderHorarios(state.race); });
    if (!window.F1Api) return;
    var r = await Promise.allSettled([
      window.F1Api.getCurrentSchedule(), window.F1Api.getDriverStandings(),
      window.F1Api.getConstructorStandings(), window.F1Api.getLastRaceResults()
    ]);
    var val = function (i) { return r[i].status === 'fulfilled' ? r[i].value : null; };
    var t = agora();
    // o GP da vez: o primeiro cuja corrida ainda não terminou (fica na página até 1 dia depois da bandeirada)
    var races = (val(0) && val(0).races) || [];
    state.race = races.find(function (x) {
      var s = x.sessions[x.sessions.length - 1];
      return s && s.inicio.getTime() + DIA > t.getTime();
    }) || null;
    if (state.race) {
      renderHero(state.race);
      renderHorarios(state.race);
      renderCircuito(state.race);
    } else {
      $('gp-hero-title').textContent = races.length ? 'Temporada encerrada' : 'Central do GP';
      $('gp-hero-sub').textContent = races.length ? 'O calendário do ano que vem aparece aqui assim que sair.' : 'Os dados não carregaram. Tenta atualizar a página.';
      ['gp-schedule', 'gp-circuit'].forEach(function (id) { $(id).innerHTML = ''; });
    }
    renderClassificacao((val(1) || {}).standings || [], (val(2) || {}).standings || []);
    renderUltima(val(3));
    renderMaterias(state.race);
    setInterval(contagem, 30e3);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
