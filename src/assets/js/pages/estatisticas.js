(function () {
  'use strict';

  var state = {
    driversExpanded: false,
    allDrivers: []
  };

  var dom = {
    nextRaceName: document.getElementById('next-race-name'),
    nextRaceMeta: document.getElementById('next-race-meta'),
    driverLeader: document.getElementById('driver-leader'),
    driverLeaderMeta: document.getElementById('driver-leader-meta'),
    constructorLeader: document.getElementById('constructor-leader'),
    constructorLeaderMeta: document.getElementById('constructor-leader-meta'),
    seasonTotal: document.getElementById('season-total'),
    seasonMeta: document.getElementById('season-meta'),
    driversStandings: document.getElementById('drivers-standings'),
    constructorsStandings: document.getElementById('constructors-standings'),
    toggleDrivers: document.getElementById('toggle-drivers'),
    driverSearch: document.getElementById('driver-search'),
    driversCards: document.getElementById('drivers-cards'),
    seasonSelect: document.getElementById('season-select'),
    loadSeason: document.getElementById('load-season'),
    historyList: document.getElementById('history-list')
  };

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
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function setText(el, value) {
    if (el) el.textContent = value || '—';
  }

  function setBusy(el, busy) {
    if (el) el.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function status(message) {
    return '<div class="status">' + escapeHtml(message) + '</div>';
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function renderDriverStandings(drivers) {
    if (!dom.driversStandings) return;
    var list = state.driversExpanded ? drivers : drivers.slice(0, 10);

    setBusy(dom.driversStandings, false);
    if (!list.length) {
      dom.driversStandings.innerHTML = status('Classificação de pilotos indisponível.');
      return;
    }

    dom.driversStandings.innerHTML =
      '<div class="table-row head">' +
        '<span>Pos</span><span>Piloto</span><span class="hide-mobile">Equipe</span><span>Pontos</span><span class="hide-mobile">Vit.</span>' +
      '</div>' +
      list.map(function (driver) {
        return (
          '<div class="table-row">' +
            '<span class="pos">' + escapeHtml(driver.position) + '</span>' +
            '<span class="strong">' + escapeHtml(driver.name) + '</span>' +
            '<span class="team-pill hide-mobile" style="--team-color:' + escapeHtml(driver.teamColor) + '">' + escapeHtml(driver.team) + '</span>' +
            '<span class="strong">' + escapeHtml(driver.points) + '</span>' +
            '<span class="hide-mobile">' + escapeHtml(driver.wins) + '</span>' +
          '</div>'
        );
      }).join('');
  }

  function renderConstructorStandings(constructors) {
    if (!dom.constructorsStandings) return;
    setBusy(dom.constructorsStandings, false);

    if (!constructors.length) {
      dom.constructorsStandings.innerHTML = status('Classificação de equipes indisponível.');
      return;
    }

    dom.constructorsStandings.innerHTML =
      '<div class="table-row head">' +
        '<span>Pos</span><span>Equipe</span><span class="hide-mobile">Nacionalidade</span><span>Pontos</span><span class="hide-mobile">Vit.</span>' +
      '</div>' +
      constructors.map(function (team) {
        return (
          '<div class="table-row">' +
            '<span class="pos">' + escapeHtml(team.position) + '</span>' +
            '<span class="team-pill strong" style="--team-color:' + escapeHtml(team.color) + '">' + escapeHtml(team.name) + '</span>' +
            '<span class="hide-mobile">' + escapeHtml(team.nationality) + '</span>' +
            '<span class="strong">' + escapeHtml(team.points) + '</span>' +
            '<span class="hide-mobile">' + escapeHtml(team.wins) + '</span>' +
          '</div>'
        );
      }).join('');
  }

  function renderDriversCards(drivers) {
    if (!dom.driversCards) return;
    setBusy(dom.driversCards, false);

    if (!drivers.length) {
      dom.driversCards.innerHTML = status('Nenhum piloto encontrado.');
      return;
    }

    dom.driversCards.innerHTML = drivers.map(function (driver) {
      var photo = driver.photo ?
        '<img class="driver-photo" src="' + escapeHtml(driver.photo) + '" alt="Foto de ' + escapeHtml(driver.name) + '" loading="lazy">' :
        '<div class="driver-photo" role="img" aria-label="Foto indisponível"></div>';

      return (
        '<article class="driver-card" style="--team-color:' + escapeHtml(driver.teamColor) + '">' +
          photo +
          '<div class="driver-body">' +
            '<h3>' + escapeHtml(driver.name) + '</h3>' +
            '<p class="driver-meta"><strong>#' + escapeHtml(driver.number) + '</strong> · ' + escapeHtml(driver.team) + '</p>' +
            '<p class="driver-meta">' + escapeHtml(driver.nationality) + ' · ' + escapeHtml(driver.points) + ' pts</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function filterDrivers() {
    var term = normalize(dom.driverSearch ? dom.driverSearch.value : '');
    var filtered = state.allDrivers.filter(function (driver) {
      return normalize(driver.name + ' ' + driver.team + ' ' + driver.nationality + ' ' + driver.number).includes(term);
    });
    renderDriversCards(filtered);
  }

  function renderScheduleSummary(schedule) {
    var races = schedule.races || [];
    var nextRace = window.F1Api.getNextRace(races);

    setText(dom.seasonTotal, races.length ? String(races.length) : '—');
    setText(dom.seasonMeta, schedule.season ? 'Temporada ' + schedule.season : 'Temporada atual');

    if (!nextRace) {
      setText(dom.nextRaceName, 'A definir');
      setText(dom.nextRaceMeta, 'Calendário indisponível');
      return;
    }

    setText(dom.nextRaceName, nextRace.name);
    setText(dom.nextRaceMeta, [formatDate(nextRace.date), nextRace.circuit, nextRace.country].filter(Boolean).join(' · '));
  }

  function renderHistory(races, season) {
    setBusy(dom.historyList, false);

    if (!races.length) {
      dom.historyList.innerHTML = status('Nenhuma corrida encontrada para ' + season + '.');
      return;
    }

    dom.historyList.innerHTML = races.map(function (race) {
      var place = [race.locality, race.country].filter(Boolean).join(', ');
      var result = race.winner ? 'Vencedor: ' + race.winner + (race.winnerTeam ? ' · ' + race.winnerTeam : '') : 'Resultado ainda não disponível';

      return (
        '<article class="race-card">' +
          '<h3>' + escapeHtml(race.round + '. ' + race.name) + '</h3>' +
          '<p>' + escapeHtml(formatDate(race.date)) + ' · ' + escapeHtml(place || race.circuit) + '</p>' +
          '<p>' + escapeHtml(result) + '</p>' +
        '</article>'
      );
    }).join('');
  }

  function setupSeasonSelect() {
    if (!dom.seasonSelect) return;
    var currentYear = new Date().getFullYear();
    var years = [];

    for (var year = currentYear; year >= 1950; year -= 1) {
      years.push(year);
    }

    dom.seasonSelect.innerHTML = years.map(function (year) {
      return '<option value="' + year + '">' + year + '</option>';
    }).join('');
  }

  async function loadCurrentData() {
    try {
      var results = await Promise.allSettled([
        window.F1Api.getDriverStandings(),
        window.F1Api.getConstructorStandings(),
        window.F1Api.getCurrentSchedule()
      ]);

      if (results[0].status === 'fulfilled') {
        var driverData = results[0].value;
        state.allDrivers = driverData.standings;
        renderDriverStandings(driverData.standings);
        renderDriversCards(driverData.standings);

        var leader = driverData.standings[0];
        if (leader) {
          setText(dom.driverLeader, leader.name);
          setText(dom.driverLeaderMeta, leader.points + ' pts · ' + leader.wins + ' vitórias');
        }
      } else {
        dom.driversStandings.innerHTML = status('Não foi possível carregar a classificação de pilotos.');
        dom.driversCards.innerHTML = status('Não foi possível carregar os pilotos.');
      }

      if (results[1].status === 'fulfilled') {
        var constructorData = results[1].value;
        renderConstructorStandings(constructorData.standings);

        var constructorLeader = constructorData.standings[0];
        if (constructorLeader) {
          setText(dom.constructorLeader, constructorLeader.name);
          setText(dom.constructorLeaderMeta, constructorLeader.points + ' pts · ' + constructorLeader.wins + ' vitórias');
        }
      } else {
        dom.constructorsStandings.innerHTML = status('Não foi possível carregar a classificação de equipes.');
      }

      if (results[2].status === 'fulfilled') {
        renderScheduleSummary(results[2].value);
      } else {
        setText(dom.nextRaceName, 'A definir');
        setText(dom.nextRaceMeta, 'Calendário indisponível');
        setText(dom.seasonTotal, '—');
      }
    } catch (err) {
      console.warn('Central de Dados:', err);
    }
  }

  async function loadSeasonHistory() {
    var season = dom.seasonSelect ? dom.seasonSelect.value : new Date().getFullYear();
    setBusy(dom.historyList, true);
    dom.historyList.innerHTML = status('Carregando temporada ' + season + '…');

    try {
      // Resultados são tentados primeiro; se a temporada ainda não tiver resultados, caímos para o calendário.
      var resultData = await window.F1Api.getSeasonResults(season).catch(function () {
        return window.F1Api.getSeasonSchedule(season);
      });
      renderHistory(resultData.races || [], season);
    } catch (err) {
      console.warn('Histórico F1:', err);
      setBusy(dom.historyList, false);
      dom.historyList.innerHTML = status('Não foi possível carregar a temporada ' + season + '.');
    }
  }

  function bindEvents() {
    if (dom.toggleDrivers) {
      dom.toggleDrivers.addEventListener('click', function () {
        state.driversExpanded = !state.driversExpanded;
        dom.toggleDrivers.textContent = state.driversExpanded ? 'Ver top 10' : 'Ver completa';
        renderDriverStandings(state.allDrivers);
      });
    }

    if (dom.driverSearch) {
      dom.driverSearch.addEventListener('input', filterDrivers);
    }

    if (dom.loadSeason) {
      dom.loadSeason.addEventListener('click', loadSeasonHistory);
    }
  }

  setupSeasonSelect();
  bindEvents();
  loadCurrentData();
})();
