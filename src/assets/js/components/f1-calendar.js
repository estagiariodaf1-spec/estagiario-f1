(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Data a definir';
    var date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function getCircuitDetails(circuitId) {
    return (global.F1CircuitDetails && global.F1CircuitDetails[circuitId]) || {};
  }

  function trackMarkup(details, sizeClass) {
    if (details.map) {
      return '<div class="' + sizeClass + '"><img src="' + escapeHtml(details.map) + '" alt="Traçado do circuito" loading="lazy"></div>';
    }
    return '<div class="' + sizeClass + '"><div class="map-placeholder">Mapa em atualização</div></div>';
  }

  function dataItem(label, value) {
    return '<div class="f1-data-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || 'Em atualização') + '</strong></div>';
  }

  function cardTemplate(race) {
    var details = getCircuitDetails(race.circuitId);
    var place = [race.locality, race.country].filter(Boolean).join(', ') || race.country || 'País a definir';

    return (
      '<article class="f1-race-card" data-race-card>' +
        '<button class="f1-race-toggle" type="button" data-race-toggle aria-expanded="false">' +
          '<span class="f1-race-round">' + escapeHtml(String(race.round).padStart(2, '0')) + '</span>' +
          '<span class="f1-race-main">' +
            '<h3 class="f1-race-name">' + escapeHtml(race.name) + '</h3>' +
            '<p class="f1-race-meta">' + escapeHtml(place) + ' · ' + escapeHtml(formatDate(race.date)) + '</p>' +
            trackMarkup(details, 'f1-track-mini') +
          '</span>' +
        '</button>' +
        '<div class="f1-race-details">' +
          '<div class="f1-race-details-inner">' +
            '<div class="f1-race-details-content">' +
              trackMarkup(details, 'f1-track-large') +
              '<div class="f1-race-data">' +
                dataItem('Circuito', race.circuit) +
                dataItem('País', race.country) +
                dataItem('Extensão', details.lengthKm) +
                dataItem('Voltas', details.laps) +
                dataItem('Distância total', details.raceDistance) +
                dataItem('Recorde da pista', details.lapRecord) +
                dataItem('Zonas de DRS', details.drsZones) +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function bindToggles(root) {
    root.querySelectorAll('[data-race-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('[data-race-card]');
        var isOpen = card.classList.toggle('is-open');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  async function mount(selector) {
    var root = document.querySelector(selector || '[data-f1-calendar]');
    if (!root || !global.F1Api) return;

    root.innerHTML = '<div class="f1-calendar-status">Carregando calendário da temporada…</div>';

    try {
      var data = await global.F1Api.getCurrentSchedule();
      var races = data.races || [];
      if (!races.length) throw new Error('Calendário vazio');

      root.innerHTML =
        '<div class="f1-calendar-shell">' +
          '<div class="f1-calendar-hero">' +
            '<div>' +
              '<p class="f1-calendar-kicker">Calendário F1 ' + escapeHtml(data.season || '') + '</p>' +
              '<h2 class="f1-calendar-title">Todas as etapas</h2>' +
              '<p class="f1-calendar-subtitle">Clique em um GP para ver mapa e detalhes técnicos do circuito.</p>' +
            '</div>' +
          '</div>' +
          '<div class="f1-calendar-grid">' + races.map(cardTemplate).join('') + '</div>' +
        '</div>';

      bindToggles(root);
    } catch (err) {
      console.warn('Calendário F1:', err);
      root.innerHTML = '<div class="f1-calendar-shell"><div class="f1-calendar-status">Não foi possível carregar o calendário agora.</div></div>';
    }
  }

  global.F1Calendar = {
    mount: mount
  };
})(window);
