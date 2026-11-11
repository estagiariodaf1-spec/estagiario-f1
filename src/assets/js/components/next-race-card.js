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
    if (!dateStr) return 'A definir';
    var date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime(timeStr) {
    if (!timeStr) return 'A definir';
    return timeStr.replace('Z', '').slice(0, 5);
  }

  function detailsFor(circuitId) {
    return (global.F1CircuitDetails && global.F1CircuitDetails[circuitId]) || {};
  }

  function mapMarkup(details) {
    return ''; // mapas saem até termos traçados reais (OpenF1)
  }

  async function mount(selector) {
    var root = document.querySelector(selector || '[data-next-race-content]');
    if (!root || !global.F1Api) return;

    root.innerHTML = '<div class="next-race-status">Carregando próxima corrida…</div>';

    try {
      var payload = await global.F1Api.getNextRaceFromApi();
      var race = payload.race;
      if (!race) throw new Error('Próxima corrida vazia');

      var details = detailsFor(race.circuitId);
      var place = [race.locality, race.country].filter(Boolean).join(', ');

      root.innerHTML =
        '<div class="race-title">' + escapeHtml(race.name) + '</div>' +
        '<div class="muted">' + escapeHtml(place || race.circuit) + '</div>' +
        mapMarkup(details) +
        '<div style="margin-top:12px">' +
          '<div class="info-row"><span>Data</span><strong>' + escapeHtml(formatDate(race.date)) + '</strong></div>' +
          '<div class="info-row"><span>Horário</span><strong>' + escapeHtml(formatTime(race.time)) + '</strong></div>' +
          '<div class="info-row"><span>Circuito</span><strong>' + escapeHtml(race.circuit) + '</strong></div>' +
        '</div>' +
        '<details class="race-details">' +
          '<summary>Mais sobre o GP</summary>' +
          '<div class="race-details-body">' +
            '<h4>Dados da corrida</h4>' +
            '<div class="info-row"><span>Voltas</span><strong>' + escapeHtml(details.laps || 'Em atualização') + '</strong></div>' +
            '<div class="info-row"><span>Extensão</span><strong>' + escapeHtml(details.lengthKm || 'Em atualização') + '</strong></div>' +
            '<div class="info-row"><span>Distância</span><strong>' + escapeHtml(details.raceDistance || 'Em atualização') + '</strong></div>' +
            '<h4>Recorde da pista</h4>' +
            '<div class="info-row"><span>Corrida</span><strong>' + escapeHtml(details.lapRecord || 'Em atualização') + '</strong></div>' +
            '<h4>DRS</h4>' +
            '<div class="info-row"><span>Zonas</span><strong>' + escapeHtml(details.drsZones || 'Em atualização') + '</strong></div>' +
          '</div>' +
        '</details>';
    } catch (err) {
      console.warn('Próxima corrida:', err);
      root.innerHTML = '<div class="next-race-status">Não foi possível carregar a próxima corrida.</div>';
    }
  }

  global.NextRaceCard = {
    mount: mount
  };
})(window);
