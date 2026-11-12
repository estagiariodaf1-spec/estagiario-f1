(function () {
  var DataSources = {
    jolpicaDrivers: 'https://api.jolpi.ca/ergast/f1/current/drivers.json',
    jolpicaStandings: 'https://api.jolpi.ca/ergast/f1/current/driverstandings.json',
    openF1Drivers: 'https://api.openf1.org/v1/drivers?session_key=latest'
  };

  var TeamColors = {
    alpine: '#2293d1',
    aston_martin: '#006f62',
    audi: '#f50537',
    cadillac: '#9d7a3a',
    ferrari: '#dc0000',
    haas: '#b6babd',
    mclaren: '#ff8700',
    mercedes: '#00d2be',
    rb: '#2b4562',
    red_bull: '#1e41ff',
    williams: '#005aff'
  };

  var Nationalities = {
    Argentine: 'Argentino',
    Australian: 'Australiano',
    Brazilian: 'Brasileiro',
    British: 'Britânico',
    Canadian: 'Canadense',
    Dutch: 'Holandês',
    Finnish: 'Finlandês',
    French: 'Francês',
    German: 'Alemão',
    Italian: 'Italiano',
    Mexican: 'Mexicano',
    Monegasque: 'Monegasco',
    'New Zealander': 'Neozelandês',
    Spanish: 'Espanhol',
    Thai: 'Tailandês'
  };

  var grid = document.getElementById('drivers-grid');
  var meta = document.getElementById('drivers-meta');

  if (!grid) return;

  var Utils = {
    escapeHtml: function (value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    normalize: function (value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    },

    formatBirth: function (dateStr) {
      if (!dateStr) return '—';
      var parts = String(dateStr).split('-');
      if (parts.length !== 3) return dateStr;
      return parts[2] + '/' + parts[1] + '/' + parts[0];
    },

    nationalityLabel: function (nationality) {
      return window.F1Api && F1Api.nacionalidade ? F1Api.nacionalidade(nationality) : (Nationalities[nationality] || nationality || '—');
    },

    formatValue: function (value) {
      return value == null || value === '' ? '—' : value;
    },

    cleanHexColor: function (value) {
      var color = String(value || '').replace('#', '').trim();
      return /^[0-9a-f]{6}$/i.test(color) ? '#' + color : '';
    },

    initials: function (name) {
      return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (part) { return part.charAt(0); })
        .join('')
        .toUpperCase() || 'F1';
    }
  };

  var Api = {
    fetchJson: async function (url) {
      var response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status + ' em ' + url);
      return response.json();
    },

    loadAll: async function () {
      var results = await Promise.allSettled([
        this.fetchJson(DataSources.jolpicaDrivers),
        this.fetchJson(DataSources.jolpicaStandings),
        this.fetchJson(DataSources.openF1Drivers)
      ]);

      if (results[0].status !== 'fulfilled' || results[1].status !== 'fulfilled') {
        throw new Error('Jolpica indisponível');
      }

      return {
        driversData: results[0].value,
        standingsData: results[1].value,
        openF1Data: results[2].status === 'fulfilled' ? results[2].value : []
      };
    }
  };

  var DriverMapper = {
    buildOpenF1Indexes: function (openF1Drivers) {
      return openF1Drivers.reduce(function (indexes, driver) {
        if (driver.driver_number != null) indexes.byNumber[String(driver.driver_number)] = driver;
        if (driver.name_acronym) indexes.byCode[Utils.normalize(driver.name_acronym)] = driver;
        if (driver.full_name) indexes.byName[Utils.normalize(driver.full_name)] = driver;
        if (driver.first_name || driver.last_name) {
          indexes.byName[Utils.normalize((driver.first_name || '') + ' ' + (driver.last_name || ''))] = driver;
        }
        return indexes;
      }, { byNumber: {}, byCode: {}, byName: {} });
    },

    findOpenF1Driver: function (driver, indexes) {
      var fullName = ((driver.givenName || '') + ' ' + (driver.familyName || '')).trim();
      return indexes.byNumber[String(driver.permanentNumber)] ||
        indexes.byCode[Utils.normalize(driver.code)] ||
        indexes.byName[Utils.normalize(fullName)] ||
        null;
    },

    standingsByDriverId: function (standings) {
      return standings.reduce(function (index, entry) {
        if (entry.Driver && entry.Driver.driverId) index[entry.Driver.driverId] = entry;
        return index;
      }, {});
    },

    merge: function (payload) {
      var driverTable = payload.driversData.MRData.DriverTable;
      var standingsTable = payload.standingsData.MRData.StandingsTable;
      var standingsList = standingsTable.StandingsLists && standingsTable.StandingsLists[0];
      var standings = standingsList ? standingsList.DriverStandings || [] : [];
      var standingIndex = this.standingsByDriverId(standings);
      var openF1Index = this.buildOpenF1Indexes(payload.openF1Data || []);

      var drivers = (driverTable.Drivers || []).filter(function (driver) {
        return driver.driverId !== 'jak_crawford';
      }).map(function (driver) {
        var standing = standingIndex[driver.driverId] || null;
        var standingDriver = standing && standing.Driver ? standing.Driver : {};
        var mergedDriver = Object.assign({}, driver, standingDriver);
        var openF1Driver = DriverMapper.findOpenF1Driver(mergedDriver, openF1Index);
        var constructor = standing && standing.Constructors ? standing.Constructors[0] : null;
        var teamColor = openF1Driver && Utils.cleanHexColor(openF1Driver.team_colour);
        var constructorColor = constructor && TeamColors[constructor.constructorId];
        var fullName = ((mergedDriver.givenName || '') + ' ' + (mergedDriver.familyName || '')).trim();

        return {
          id: mergedDriver.driverId,
          name: fullName || (openF1Driver && openF1Driver.full_name) || 'Piloto',
          code: mergedDriver.code || (openF1Driver && openF1Driver.name_acronym) || '—',
          number: mergedDriver.permanentNumber || (openF1Driver && openF1Driver.driver_number) || '—',
          team: (constructor && constructor.name) || (openF1Driver && openF1Driver.team_name) || '—',
          teamColor: teamColor || constructorColor || '#ff2b2b',
          photo: openF1Driver && openF1Driver.headshot_url,
          nationality: Utils.nationalityLabel(mergedDriver.nationality),
          birthDate: Utils.formatBirth(mergedDriver.dateOfBirth),
          points: standing ? standing.points : '—',
          position: standing ? standing.position : '—',
          wins: standing ? standing.wins : '—',
          championshipOrder: standing ? Number(standing.position) : 999,
          sourceUrl: mergedDriver.url || ''
        };
      });

      return {
        season: standingsTable.season || driverTable.season,
        drivers: drivers.sort(function (a, b) {
          if (a.championshipOrder !== b.championshipOrder) return a.championshipOrder - b.championshipOrder;
          return a.name.localeCompare(b.name, 'pt-BR');
        })
      };
    }
  };

  var DriversView = {
    setStatus: function (message) {
      grid.setAttribute('aria-busy', 'true');
      grid.innerHTML = '<p class="drivers-status">' + Utils.escapeHtml(message) + '</p>';
    },

    renderError: function () {
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = '<p class="drivers-status">Não foi possível carregar os dados dos pilotos.</p>';
    },

    renderMeta: function (season, count) {
      if (!meta) return;
      meta.textContent = 'Temporada ' + Utils.formatValue(season) + ' · ' + count + ' pilotos';
    },

    render: function (drivers, season) {
      this.renderMeta(season, drivers.length);
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = drivers.map(this.cardTemplate).join('');
      this.bindToggle();
    },

    cardTemplate: function (driver, index) {
      var safeId = 'driver-details-' + Utils.escapeHtml(driver.id || index);
      // sem foto (ou foto quebrada): iniciais na cor da equipe, em vez de um quadrado preto vazio
      var iniciais = '<div class="driver-photo driver-photo--iniciais" role="img" aria-label="' + Utils.escapeHtml(driver.name) + '">' +
        Utils.escapeHtml(Utils.initials(driver.name)) + '</div>';
      var photo = driver.photo ?
        '<img class="driver-photo" src="' + Utils.escapeHtml(driver.photo) + '" alt="Foto de ' + Utils.escapeHtml(driver.name) +
        '" loading="lazy" onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>' + iniciais + '</template>' :
        iniciais;

      return (
        '<article class="driver-card" data-driver-card style="--team-color:' + Utils.escapeHtml(driver.teamColor) + '">' +
          '<div class="driver-card-main">' +
            photo +
            '<div>' +
              '<div><span class="driver-number">' + Utils.escapeHtml(driver.number) + '</span> ' +
              '<span class="driver-code">' + Utils.escapeHtml(driver.code) + '</span></div>' +
              '<button type="button" class="driver-name-button" data-driver-toggle aria-expanded="false" aria-controls="' + safeId + '">' +
                Utils.escapeHtml(driver.name) +
              '</button>' +
              '<p class="driver-summary"><span class="team-chip">' + Utils.escapeHtml(driver.team) + '</span></p>' +
            '</div>' +
          '</div>' +
          '<div class="driver-details" id="' + safeId + '" data-driver-details>' +
            '<div class="driver-data-grid">' +
              DriversView.dataCell('Número', driver.number) +
              DriversView.dataCell('Equipe', driver.team) +
              DriversView.dataCell('Nacionalidade', driver.nationality) +
              DriversView.dataCell('Pontos', driver.points) +
              DriversView.dataCell('Posição no campeonato', driver.position) +
              DriversView.dataCell('Vitórias', driver.wins) +
            '</div>' +
          '</div>' +
        '</article>'
      );
    },

    dataCell: function (label, value) {
      return '<div class="driver-data"><span>' + Utils.escapeHtml(label) + '</span><strong>' +
        Utils.escapeHtml(Utils.formatValue(value)) + '</strong></div>';
    },

    bindToggle: function () {
      grid.querySelectorAll('[data-driver-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
          var card = button.closest('[data-driver-card]');
          var isOpen = card.classList.toggle('is-open');
          button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
      });
    }
  };

  var DriversController = {
    init: async function () {
      DriversView.setStatus('Carregando dados dos pilotos…');
      try {
        var payload = await Api.loadAll();
        var merged = DriverMapper.merge(payload);
        DriversView.render(merged.drivers, merged.season);
      } catch (err) {
        console.warn('Pilotos F1:', err);
        DriversView.renderError();
      }
    }
  };

  DriversController.init();
})();
