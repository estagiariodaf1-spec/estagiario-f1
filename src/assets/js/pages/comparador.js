(function () {
  'use strict';

  var state = {
    drivers: []
  };

  var dom = {
    driverA: document.getElementById('driver-a'),
    driverB: document.getElementById('driver-b'),
    button: document.getElementById('compare-button'),
    output: document.getElementById('compare-output')
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function numberValue(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function status(message) {
    return '<div class="data-card"><div class="status">' + escapeHtml(message) + '</div></div>';
  }

  function setBusy(busy) {
    if (dom.output) dom.output.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function findDriver(id) {
    return state.drivers.find(function (driver) {
      return driver.id === id;
    }) || null;
  }

  function statClass(driver, other, key, lowerIsBetter) {
    var driverValue = numberValue(driver[key]);
    var otherValue = numberValue(other[key]);
    var isBetter = lowerIsBetter ? driverValue < otherValue : driverValue > otherValue;
    return isBetter ? ' compare-winner' : '';
  }

  function driverPhoto(driver) {
    if (driver.photo) {
      return '<img class="compare-photo" src="' + escapeHtml(driver.photo) + '" alt="Foto de ' + escapeHtml(driver.name) + '" loading="lazy">';
    }
    return '<div class="compare-photo" role="img" aria-label="Foto indisponível"></div>';
  }

  function compareCard(driver, other) {
    return (
      '<article class="compare-card" style="--team-color:' + escapeHtml(driver.teamColor) + '">' +
        '<div class="compare-hero">' +
          driverPhoto(driver) +
          '<div>' +
            '<p class="compare-number">#' + escapeHtml(driver.number) + ' · ' + escapeHtml(driver.code) + '</p>' +
            '<h2 class="compare-name">' + escapeHtml(driver.name) + '</h2>' +
            '<p class="compare-meta"><span class="team-pill" style="--team-color:' + escapeHtml(driver.teamColor) + '">' + escapeHtml(driver.team) + '</span></p>' +
            '<p class="compare-meta">' + escapeHtml(driver.nationality) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="compare-stats">' +
          statCell('Posição', driver.position, statClass(driver, other, 'position', true)) +
          statCell('Pontos', driver.points, statClass(driver, other, 'points', false)) +
          statCell('Vitórias', driver.wins, statClass(driver, other, 'wins', false)) +
          statCell('Equipe', driver.team, '') +
        '</div>' +
      '</article>'
    );
  }

  function statCell(label, value, extraClass) {
    return (
      '<div class="compare-stat">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<strong class="' + extraClass + '">' + escapeHtml(value) + '</strong>' +
      '</div>'
    );
  }

  function renderSummary(a, b) {
    var pointsDiff = Math.abs(numberValue(a.points) - numberValue(b.points));
    var positionLeader = numberValue(a.position) < numberValue(b.position) ? a : b;
    var pointsLeader = numberValue(a.points) > numberValue(b.points) ? a : b;
    var winsLeader = numberValue(a.wins) > numberValue(b.wins) ? a : b;

    return (
      '<aside class="compare-summary">' +
        '<h2>Leitura rápida</h2>' +
        '<ul class="compare-summary-list">' +
          '<li><span>Melhor posição</span><strong>' + escapeHtml(positionLeader.name) + ' (#' + escapeHtml(positionLeader.position) + ')</strong></li>' +
          '<li><span>Mais pontos</span><strong>' + escapeHtml(pointsLeader.name) + ' (' + escapeHtml(pointsLeader.points) + ' pts)</strong></li>' +
          '<li><span>Diferença de pontos</span><strong>' + escapeHtml(pointsDiff) + ' pts</strong></li>' +
          '<li><span>Mais vitórias</span><strong>' + escapeHtml(winsLeader.name) + ' (' + escapeHtml(winsLeader.wins) + ')</strong></li>' +
        '</ul>' +
      '</aside>'
    );
  }

  function renderComparison() {
    var driverA = findDriver(dom.driverA.value);
    var driverB = findDriver(dom.driverB.value);

    if (!driverA || !driverB) {
      dom.output.innerHTML = status('Escolha dois pilotos para comparar.');
      return;
    }

    if (driverA.id === driverB.id) {
      dom.output.innerHTML = status('Escolha dois pilotos diferentes.');
      return;
    }

    setBusy(false);
    dom.output.innerHTML =
      '<div class="compare-grid">' +
        compareCard(driverA, driverB) +
        compareCard(driverB, driverA) +
      '</div>' +
      renderSummary(driverA, driverB);
  }

  function renderSelects() {
    var options = state.drivers.map(function (driver) {
      return '<option value="' + escapeHtml(driver.id) + '">' + escapeHtml(driver.position + '. ' + driver.name + ' - ' + driver.team) + '</option>';
    }).join('');

    dom.driverA.innerHTML = options;
    dom.driverB.innerHTML = options;

    if (state.drivers[0]) dom.driverA.value = state.drivers[0].id;
    if (state.drivers[1]) dom.driverB.value = state.drivers[1].id;
  }

  async function init() {
    setBusy(true);
    dom.output.innerHTML = status('Carregando dados da temporada atual…');

    try {
      var data = await window.F1Api.getDriverStandings();
      state.drivers = data.standings.filter(function (driver) {
        return driver.id !== 'jak_crawford';
      });

      if (state.drivers.length < 2) {
        dom.output.innerHTML = status('Não há pilotos suficientes para comparar.');
        return;
      }

      renderSelects();
      renderComparison();
    } catch (err) {
      console.warn('Comparador F1:', err);
      setBusy(false);
      dom.output.innerHTML = status('Não foi possível carregar os dados do comparador.');
    }
  }

  if (dom.button) dom.button.addEventListener('click', renderComparison);
  if (dom.driverA) dom.driverA.addEventListener('change', renderComparison);
  if (dom.driverB) dom.driverB.addEventListener('change', renderComparison);

  init();
})();
