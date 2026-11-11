(function () {
  'use strict';

  var TZ_OPTIONS = [
    { id: 'America/Sao_Paulo', label: 'Brasília' },
    { id: 'America/Rio_Branco', label: 'Acre' },
    { id: 'America/Manaus', label: 'Manaus' },
    { id: 'America/Noronha', label: 'Noronha' }
  ];

  var COUNTRY_FLAGS = {
    Canada: '🇨🇦',
    Monaco: '🇲🇨',
    'United Kingdom': '🇬🇧',
    UK: '🇬🇧',
    Belgium: '🇧🇪',
    Italy: '🇮🇹',
    USA: '🇺🇸',
    'United States': '🇺🇸',
    Brazil: '🇧🇷',
    UAE: '🇦🇪',
    'United Arab Emirates': '🇦🇪',
    Mexico: '🇲🇽',
    Qatar: '🇶🇦',
    Australia: '🇦🇺',
    Japan: '🇯🇵',
    China: '🇨🇳',
    Spain: '🇪🇸',
    Austria: '🇦🇹',
    Netherlands: '🇳🇱',
    Hungary: '🇭🇺',
    Singapore: '🇸🇬',
    Azerbaijan: '🇦🇿',
    Bahrain: '🇧🇭',
    'Saudi Arabia': '🇸🇦'
  };

  var DAY_OFFSET = { sexta: -2, sabado: -1, domingo: 0 };
  var DAY_LABEL = { sexta: 'Sexta', sabado: 'Sábado', domingo: 'Domingo' };

  var state = {
    nextRace: null,
    lastRace: null,
    drivers: [],
    constructors: [],
    circuitDetails: {},
    countdownTarget: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDatePt(dateStr, timeStr) {
    if (!dateStr) return 'A definir';
    var iso = dateStr + 'T' + (timeStr || '12:00:00').replace('Z', 'Z');
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  // Horário de Brasília a partir da data + hora UTC da API.
  function formatTimeUtc(timeStr, dateStr) {
    if (!timeStr) return 'A definir';
    if (!dateStr) return timeStr.slice(0, 5) + ' UTC';
    var d = new Date(dateStr + 'T' + timeStr);
    if (isNaN(d)) return timeStr.slice(0, 5) + ' UTC';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  function flagFor(country) {
    return COUNTRY_FLAGS[country] || '🏁';
  }

  function circuitDetails(circuitId) {
    return (window.F1CircuitDetails && window.F1CircuitDetails[circuitId]) || {};
  }

  function mapImageHtml(details, className) {
    return ''; // mapas saem até termos traçados reais (OpenF1)
  }

  /** Status do GP: próximo, ao vivo (janela do fim de semana) ou encerrado. */
  function raceStatus(race) {
    if (!race || !race.date) return { key: 'next', label: 'Próximo GP' };
    var raceStart = new Date(race.date + 'T' + (race.time || '14:00:00Z'));
    var weekendStart = new Date(raceStart);
    weekendStart.setDate(weekendStart.getDate() - 2);
    weekendStart.setHours(0, 0, 0, 0);
    var weekendEnd = new Date(raceStart);
    weekendEnd.setDate(weekendEnd.getDate() + 1);
    weekendEnd.setHours(23, 59, 59, 999);
    var now = new Date();

    if (now > weekendEnd) return { key: 'done', label: 'GP encerrado' };
    if (now >= weekendStart && now <= weekendEnd) return { key: 'live', label: 'Ao vivo' };
    return { key: 'next', label: 'Próximo GP' };
  }

  function renderHero(race) {
    var details = circuitDetails(race.circuitId);
    var status = raceStatus(race);
    var place = [race.locality, race.country].filter(Boolean).join(', ');

    $('gp-hero-flag').textContent = flagFor(race.countryEn || race.country);
    $('gp-hero-title').textContent = race.name;
    $('gp-hero-sub').textContent = (race.circuit || 'Circuito') + (place ? ' · ' + place : '');
    $('gp-hero-date').textContent = formatDatePt(race.date, race.time);

    var statusEl = $('gp-status');
    statusEl.textContent = status.label;
    statusEl.className = 'gp-status gp-status--' + status.key;

    if ($('gp-hero-map')) $('gp-hero-map').innerHTML = mapImageHtml(details);

    state.countdownTarget = race.date
      ? new Date(race.date + 'T' + (race.time || '14:00:00Z'))
      : null;
    updateCountdown();
  }

  function updateCountdown() {
    var el = $('gp-countdown');
    if (!el || !state.countdownTarget) {
      if (el) el.textContent = '';
      return;
    }
    var diff = state.countdownTarget - new Date();
    if (diff <= 0) {
      el.textContent = 'Corrida em andamento ou concluída';
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    el.textContent = days + 'd ' + hours + 'h ' + mins + 'm ' + secs + 's';
  }

  function renderNextRaceBox(race) {
    var root = $('gp-next-race');
    if (!root) return;
    if (!race) {
      root.innerHTML = '<div class="gp-error">Próxima corrida indisponível no momento.</div>';
      return;
    }
    var details = circuitDetails(race.circuitId);
    var place = [race.locality, race.country].filter(Boolean).join(', ');

    root.innerHTML =
      '<div>' +
        '<h3 class="gp-next-title">' + escapeHtml(race.name) + '</h3>' +
        '<p class="gp-next-meta">' + escapeHtml(place || race.circuit) + '</p>' +
        '<div class="gp-info-rows">' +
          '<div class="gp-info-row"><span>Data</span><strong>' + escapeHtml(formatDatePt(race.date, race.time)) + '</strong></div>' +
          '<div class="gp-info-row"><span>Horário (Brasília)</span><strong>' + escapeHtml(formatTimeUtc(race.time, race.date)) + '</strong></div>' +
          '<div class="gp-info-row"><span>Circuito</span><strong>' + escapeHtml(race.circuit) + '</strong></div>' +
        '</div>' +
      '</div>';
  }

  function scheduleForCircuit(circuitId) {
    return (window.GpWeekendSchedule && window.GpWeekendSchedule[circuitId]) || null;
  }

  function buildSessionDate(raceDate, dayKey, timeStr, sourceTz) {
    var offset = DAY_OFFSET[dayKey];
    if (offset == null || !raceDate) return null;
    var base = new Date(raceDate + 'T12:00:00');
    base.setDate(base.getDate() + offset);
    var parts = String(timeStr || '12:00').split(':');
    var y = base.getFullYear();
    var m = String(base.getMonth() + 1).padStart(2, '0');
    var d = String(base.getDate()).padStart(2, '0');
    var h = parts[0] || '12';
    var min = parts[1] || '00';
    try {
      var fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: sourceTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      var probe = new Date(y + '-' + m + '-' + d + 'T' + h + ':' + min + ':00');
      return probe;
    } catch (e) {
      return new Date(y + '-' + m + '-' + d + 'T' + h + ':' + min + ':00');
    }
  }

  function formatInTimezone(date, tz) {
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderSchedule(race) {
    var root = $('gp-schedule');
    var tzSelect = $('gp-timezone');
    if (!root || !race) return;

    var pack = scheduleForCircuit(race.circuitId);
    var targetTz = (tzSelect && tzSelect.value) || 'America/Sao_Paulo';

    if (!pack || !pack.sessions || !pack.sessions.length) {
      root.innerHTML =
        '<div class="gp-error">Programação detalhada em atualização para este circuito. ' +
        'Horário da corrida (Brasília): <strong>' + escapeHtml(formatTimeUtc(race.time, race.date)) + '</strong>.</div>';
      return;
    }

    var sourceTz = pack.timezone || 'Europe/London';
    var html = pack.sessions.map(function (session) {
      var startDate = buildSessionDate(race.date, session.day, session.start, sourceTz);
      var timeLabel = formatInTimezone(startDate, targetTz);
      var isRace = session.key === 'race';
      return (
        '<article class="gp-session' + (isRace ? ' gp-session--race' : '') + '">' +
          '<span class="gp-session-tag">' + escapeHtml(session.label) + '</span>' +
          '<div>' +
            '<p class="gp-session-name">' + escapeHtml(session.label) + '</p>' +
            '<p class="gp-session-day">' + escapeHtml(DAY_LABEL[session.day] || session.day) + '</p>' +
          '</div>' +
          '<span class="gp-session-time">' + escapeHtml(timeLabel) + '</span>' +
        '</article>'
      );
    }).join('');

    root.innerHTML = html;
  }

  function renderCircuit(race) {
    var root = $('gp-circuit');
    if (!root || !race) return;
    var d = circuitDetails(race.circuitId);

    root.innerHTML =
      '<div class="gp-circuit-stats">' +
        statCard('Circuito', race.circuit) +
        statCard('País', race.country || '—') +
        statCard('Extensão', d.lengthKm || 'Em atualização') +
        statCard('Voltas', d.laps || 'Em atualização') +
        statCard('Distância total', d.raceDistance || 'Em atualização') +
        statCard('Recorde da pista', d.lapRecord || 'Em atualização') +
        statCard('Zonas DRS', d.drsZones != null ? d.drsZones : 'Em atualização') +
        statCard('Direção', d.direction || '—') +
      '</div>' +
      (d.notes ? '<p class="gp-circuit-note">' + escapeHtml(d.notes) + '</p>' : '');
  }

  function statCard(label, value) {
    return (
      '<div class="gp-stat-card">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<strong>' + escapeHtml(String(value)) + '</strong>' +
      '</div>'
    );
  }

  function standingRows(list, type) {
    if (!list.length) return '<p class="gp-error">Sem dados de classificação.</p>';
    var leaderPts = parseFloat(list[0].points) || 0;

    return list.slice(0, 5).map(function (row) {
      var pts = parseFloat(row.points) || 0;
      var gap = leaderPts - pts;
      var gapText = row.position === '1' ? 'Líder' : '-' + gap + ' pts';
      var name = type === 'driver' ? row.name : row.name;
      var sub = type === 'driver' ? row.team : row.nationality;

      return (
        '<div class="gp-standing-row">' +
          '<span class="gp-standing-pos">' + escapeHtml(row.position) + '</span>' +
          '<div>' +
            '<p class="gp-standing-name">' + escapeHtml(name) + '</p>' +
            '<p class="gp-standing-team">' + escapeHtml(sub) + '</p>' +
          '</div>' +
          '<div class="gp-standing-pts">' +
            escapeHtml(row.points) + ' pts' +
            '<span class="gp-standing-gap">' + escapeHtml(gapText) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderStandings(drivers, constructors) {
    var root = $('gp-standings');
    if (!root) return;

    root.innerHTML =
      '<div class="gp-standings-col">' +
        '<h3>Pilotos</h3>' + standingRows(drivers, 'driver') +
      '</div>' +
      '<div class="gp-standings-col">' +
        '<h3>Equipes</h3>' + standingRows(constructors, 'team') +
      '</div>';
  }

  function renderLastResult(payload) {
    var root = $('gp-last-result');
    if (!root) return;

    var race = payload && payload.race;
    if (!race || !race.podium || !race.podium.length) {
      root.innerHTML = '<div class="gp-error">Último resultado indisponível.</div>';
      return;
    }

    var podiumHtml = race.podium.map(function (row, index) {
      var cls = index === 0 ? ' gp-podium-card--1' : '';
      return (
        '<div class="gp-podium-card' + cls + '">' +
          '<p class="gp-podium-pos">P' + escapeHtml(row.position) + '</p>' +
          '<p class="gp-podium-name">' + escapeHtml(row.name) + '</p>' +
          '<p class="gp-podium-team">' + escapeHtml(row.team) + ' · ' + escapeHtml(row.points) + ' pts</p>' +
        '</div>'
      );
    }).join('');

    var fastest = race.fastestLap
      ? '<div class="gp-fastest">Volta mais rápida: <strong>' +
        escapeHtml(race.fastestLap.time) + '</strong> — ' +
        escapeHtml(race.fastestLap.driver) + '</div>'
      : '';

    root.innerHTML =
      '<p class="gp-next-meta">' + escapeHtml(race.name) + ' · ' + escapeHtml(formatDatePt(race.date, race.time)) + '</p>' +
      '<div class="gp-podium">' + podiumHtml + '</div>' + fastest;
  }

  function renderQuickStats(race) {
    var root = $('gp-quick-stats');
    if (!root || !race) return;
    var d = circuitDetails(race.circuitId);

    var items = [
      { label: 'Recorde da pista', value: d.lapRecord || 'Em atualização' },
      { label: 'Voltas', value: d.laps || '—' },
      { label: 'Extensão', value: d.lengthKm || '—' }
    ];

    root.innerHTML = items.map(function (item) {
      return (
        '<div class="gp-quick-stat">' +
          '<span>' + escapeHtml(item.label) + '</span>' +
          '<strong>' + escapeHtml(String(item.value)) + '</strong>' +
        '</div>'
      );
    }).join('');
  }

  var EDITORIAL_FALLBACK = [
    { tag: 'Prévia', title: 'O que esperar do fim de semana', href: 'home.html' },
    { tag: 'Horários', title: 'Todos os horários em fusos do Brasil', href: '#programacao' },
    { tag: 'Onde assistir', title: 'TV, streaming e rádio', href: 'home.html' },
    { tag: 'Análise', title: 'Setores-chave e estratégia de corrida', href: 'home.html' },
    { tag: 'Notícias', title: 'Últimas do paddock', href: 'home.html' }
  ];

  function renderEditorial() {
    var root = $('gp-editorial');
    if (!root) return;
    root.innerHTML = EDITORIAL_FALLBACK.map(function (card) {
      return (
        '<a class="gp-article-card" href="' + escapeHtml(card.href) + '">' +
          '<div class="gp-article-visual"></div>' +
          '<div class="gp-article-body">' +
            '<span class="gp-article-tag">' + escapeHtml(card.tag) + '</span>' +
            '<h3 class="gp-article-title">' + escapeHtml(card.title) + '</h3>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  /** Estrutura pronta para OpenF1 — preenche quando houver sessão ativa. */
  async function renderLiveCenter() {
    var root = $('gp-live');
    var badge = $('gp-live-badge');
    if (!root) return;

    var tiles = [
      { title: 'Leaderboard', desc: 'Posições ao vivo' },
      { title: 'Gaps', desc: 'Intervalos em tempo real' },
      { title: 'Pneus', desc: 'Compostos por piloto' },
      { title: 'Pit stops', desc: 'Paradas na corrida' },
      { title: 'Rádio', desc: 'Trechos de comunicação' },
      { title: 'Race control', desc: 'Mensagens oficiais' },
      { title: 'Clima', desc: 'Pista e ambiente' },
      { title: 'Mapa', desc: 'Posição dos carros' }
    ];

    var isLive = false;
    if (window.F1Api && window.F1Api.getOpenF1Sessions) {
      try {
        var sessions = await window.F1Api.getOpenF1Sessions();
        isLive = Array.isArray(sessions) && sessions.some(function (s) {
          return s.date_end && new Date(s.date_end) > new Date();
        });
      } catch (e) {
        console.warn('OpenF1 sessions:', e);
      }
    }

    if (badge) {
      badge.textContent = isLive ? 'Ao vivo' : 'Offline';
      badge.classList.toggle('is-on', isLive);
    }

    var intro = isLive
      ? '<p class="gp-live-msg">Sessão detectada — conectando feeds OpenF1…</p>'
      : '<p class="gp-live-msg">Live Center disponível durante sessões oficiais.</p>';

    root.innerHTML =
      intro +
      '<div class="gp-live-grid">' +
      tiles.map(function (t) {
        return (
          '<div class="gp-live-tile">' +
            '<h4>' + escapeHtml(t.title) + '</h4>' +
            '<p>' + escapeHtml(isLive ? 'Aguardando dados…' : t.desc) + '</p>' +
          '</div>'
        );
      }).join('') +
      '</div>';
  }

  function setupTabs() {
    var tabs = document.querySelectorAll('.gp-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
      });
    });

    var sections = document.querySelectorAll('.gp-panel, .gp-hero');
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          if (!id) return;
          tabs.forEach(function (t) {
            t.classList.toggle('is-active', t.getAttribute('data-tab') === id || t.getAttribute('href') === '#' + id);
          });
        });
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      if (section.id) observer.observe(section);
    });
  }

  function setupTimezone() {
    var select = $('gp-timezone');
    if (!select) return;
    select.addEventListener('change', function () {
      if (state.nextRace) renderSchedule(state.nextRace);
    });
  }

  async function loadData() {
    if (!window.F1Api) throw new Error('F1Api não carregada');

    var results = await Promise.allSettled([
      window.F1Api.getNextRaceFromApi(),
      window.F1Api.getDriverStandings(),
      window.F1Api.getConstructorStandings(),
      window.F1Api.getLastRaceResults()
    ]);

    var nextPayload = results[0].status === 'fulfilled' ? results[0].value : null;
    var driversPayload = results[1].status === 'fulfilled' ? results[1].value : { standings: [] };
    var teamsPayload = results[2].status === 'fulfilled' ? results[2].value : { standings: [] };
    var lastPayload = results[3].status === 'fulfilled' ? results[3].value : null;

    state.nextRace = nextPayload && nextPayload.race;
    state.drivers = driversPayload.standings || [];
    state.constructors = teamsPayload.standings || [];
    state.lastRace = lastPayload;

    if (!state.nextRace) throw new Error('Próximo GP não encontrado');

    renderHero(state.nextRace);
    renderNextRaceBox(state.nextRace);
    renderSchedule(state.nextRace);
    renderCircuit(state.nextRace);
    renderStandings(state.drivers, state.constructors);
    renderLastResult(state.lastRace);
    renderQuickStats(state.nextRace);
    renderEditorial();
    await renderLiveCenter();
  }

  function showGlobalError(message) {
    var heroTitle = $('gp-hero-title');
    if (heroTitle) heroTitle.textContent = 'Central do GP';
    var heroSub = $('gp-hero-sub');
    if (heroSub) heroSub.textContent = message;
    ['gp-next-race', 'gp-standings', 'gp-last-result'].forEach(function (id) {
      var el = $(id);
      if (el) el.innerHTML = '<div class="gp-error">' + escapeHtml(message) + '</div>';
    });
  }

  async function init() {
    setupTabs();
    setupTimezone();
    renderEditorial();

    try {
      await loadData();
    } catch (err) {
      console.warn('Central do GP:', err);
      showGlobalError('Alguns dados não carregaram. Tente atualizar a página.');
    }

    setInterval(updateCountdown, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
