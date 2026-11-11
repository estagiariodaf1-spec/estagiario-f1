(function (global) {
  'use strict';

  var JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1/';
  var OPENF1_BASE = 'https://api.openf1.org/v1/';

  var TEAM_COLORS = {
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


  // A Jolpica devolve nomes em inglês. Tradução dos GPs e países para o português.
  var NOMES_GP = {
    'Australian Grand Prix': 'GP da Austrália', 'Chinese Grand Prix': 'GP da China',
    'Japanese Grand Prix': 'GP do Japão', 'Bahrain Grand Prix': 'GP do Bahrein',
    'Saudi Arabian Grand Prix': 'GP da Arábia Saudita', 'Miami Grand Prix': 'GP de Miami',
    'Canadian Grand Prix': 'GP do Canadá', 'Monaco Grand Prix': 'GP de Mônaco',
    'Spanish Grand Prix': 'GP da Espanha', 'Barcelona-Catalunya Grand Prix': 'GP de Barcelona-Catalunha',
    'Austrian Grand Prix': 'GP da Áustria', 'British Grand Prix': 'GP da Inglaterra',
    'Belgian Grand Prix': 'GP da Bélgica', 'Hungarian Grand Prix': 'GP da Hungria',
    'Dutch Grand Prix': 'GP da Holanda', 'Italian Grand Prix': 'GP da Itália',
    'Emilia Romagna Grand Prix': 'GP da Emília-Romanha', 'Azerbaijan Grand Prix': 'GP do Azerbaijão',
    'Singapore Grand Prix': 'GP de Singapura', 'United States Grand Prix': 'GP dos Estados Unidos',
    'Mexico City Grand Prix': 'GP da Cidade do México', 'São Paulo Grand Prix': 'GP de São Paulo',
    'Sao Paulo Grand Prix': 'GP de São Paulo', 'Brazilian Grand Prix': 'GP do Brasil',
    'Las Vegas Grand Prix': 'GP de Las Vegas', 'Qatar Grand Prix': 'GP do Catar',
    'Abu Dhabi Grand Prix': 'GP de Abu Dhabi', 'French Grand Prix': 'GP da França',
    'Portuguese Grand Prix': 'GP de Portugal', 'Turkish Grand Prix': 'GP da Turquia',
    'German Grand Prix': 'GP da Alemanha'
  };
  var PAISES = {
    Australia: 'Austrália', China: 'China', Japan: 'Japão', Bahrain: 'Bahrein',
    'Saudi Arabia': 'Arábia Saudita', USA: 'Estados Unidos', 'United States': 'Estados Unidos',
    Canada: 'Canadá', Monaco: 'Mônaco', Spain: 'Espanha', Austria: 'Áustria', UK: 'Inglaterra',
    'United Kingdom': 'Inglaterra', Belgium: 'Bélgica', Hungary: 'Hungria', Netherlands: 'Holanda',
    Italy: 'Itália', Azerbaijan: 'Azerbaijão', Singapore: 'Singapura', Mexico: 'México',
    Brazil: 'Brasil', Qatar: 'Catar', UAE: 'Emirados Árabes', 'United Arab Emirates': 'Emirados Árabes',
    France: 'França', Portugal: 'Portugal', Turkey: 'Turquia', Germany: 'Alemanha'
  };
  function nomeGP(nome) {
    if (!nome) return 'Grande Prêmio';
    return NOMES_GP[nome] || nome.replace(/ Grand Prix$/, '').replace(/^/, 'GP ');
  }
  function nomePais(pais) { return PAISES[pais] || pais || ''; }

  function buildUrl(base, path) {
    return base + String(path || '').replace(/^\/+/, '');
  }

  async function fetchJson(url) {
    var response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url);
    return response.json();
  }

  function get(obj, path, fallback) {
    return path.reduce(function (current, key) {
      return current && current[key] != null ? current[key] : undefined;
    }, obj) ?? fallback;
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function cleanHexColor(value) {
    var color = String(value || '').replace('#', '').trim();
    return /^[0-9a-f]{6}$/i.test(color) ? '#' + color : '';
  }

  function indexOpenF1Drivers(drivers) {
    return (drivers || []).reduce(function (index, driver) {
      if (driver.driver_number != null) index.byNumber[String(driver.driver_number)] = driver;
      if (driver.name_acronym) index.byCode[normalize(driver.name_acronym)] = driver;
      if (driver.full_name) index.byName[normalize(driver.full_name)] = driver;
      if (driver.first_name || driver.last_name) {
        index.byName[normalize((driver.first_name || '') + ' ' + (driver.last_name || ''))] = driver;
      }
      return index;
    }, { byNumber: {}, byCode: {}, byName: {} });
  }

  function findOpenF1Driver(driver, index) {
    var fullName = ((driver.givenName || '') + ' ' + (driver.familyName || '')).trim();
    return index.byNumber[String(driver.permanentNumber)] ||
      index.byCode[normalize(driver.code)] ||
      index.byName[normalize(fullName)] ||
      null;
  }

  function mapDriverStanding(entry, openF1Index) {
    var driver = entry.Driver || {};
    var constructor = entry.Constructors && entry.Constructors[0] ? entry.Constructors[0] : {};
    var openF1Driver = findOpenF1Driver(driver, openF1Index);
    var fullName = ((driver.givenName || '') + ' ' + (driver.familyName || '')).trim();
    var openF1Color = openF1Driver && cleanHexColor(openF1Driver.team_colour);
    var fallbackColor = TEAM_COLORS[constructor.constructorId] || '#ff2b2b';

    return {
      id: driver.driverId,
      position: entry.position || '—',
      name: fullName || (openF1Driver && openF1Driver.full_name) || 'Piloto',
      code: driver.code || (openF1Driver && openF1Driver.name_acronym) || '—',
      number: driver.permanentNumber || (openF1Driver && openF1Driver.driver_number) || '—',
      team: constructor.name || (openF1Driver && openF1Driver.team_name) || '—',
      teamColor: openF1Color || fallbackColor,
      photo: openF1Driver && openF1Driver.headshot_url,
      nationality: driver.nationality || '—',
      points: entry.points || '0',
      wins: entry.wins || '0'
    };
  }

  function mapConstructorStanding(entry) {
    var constructor = entry.Constructor || {};
    return {
      id: constructor.constructorId,
      position: entry.position || '—',
      name: constructor.name || 'Equipe',
      nationality: constructor.nationality || '—',
      color: TEAM_COLORS[constructor.constructorId] || '#ff2b2b',
      points: entry.points || '0',
      wins: entry.wins || '0'
    };
  }

  function mapRace(race) {
    var qualifying = race.Qualifying || {};
    return {
      round: race.round || '—',
      name: nomeGP(race.raceName),
      circuitId: get(race, ['Circuit', 'circuitId'], ''),
      circuit: get(race, ['Circuit', 'circuitName'], '—'),
      locality: get(race, ['Circuit', 'Location', 'locality'], ''),
      country: nomePais(get(race, ['Circuit', 'Location', 'country'], '')),
      countryEn: get(race, ['Circuit', 'Location', 'country'], ''),
      date: race.date || '',
      time: race.time || '',
      qualifyingDate: qualifying.date || '',
      qualifyingTime: qualifying.time || '',
      winner: get(race, ['Results', 0, 'Driver', 'familyName'], ''),
      winnerTeam: get(race, ['Results', 0, 'Constructor', 'name'], '')
    };
  }

  async function getDriverStandings() {
    var standingsData = await fetchJson(buildUrl(JOLPICA_BASE, 'current/driverstandings.json'));
    var openF1Data = await fetchJson(buildUrl(OPENF1_BASE, 'drivers?session_key=latest')).catch(function () {
      return [];
    });
    var list = get(standingsData, ['MRData', 'StandingsTable', 'StandingsLists', 0], {});
    var openF1Index = indexOpenF1Drivers(openF1Data);

    return {
      season: get(standingsData, ['MRData', 'StandingsTable', 'season'], list.season || ''),
      round: get(standingsData, ['MRData', 'StandingsTable', 'round'], list.round || ''),
      standings: (list.DriverStandings || []).map(function (entry) {
        return mapDriverStanding(entry, openF1Index);
      })
    };
  }

  async function getConstructorStandings() {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, 'current/constructorstandings.json'));
    var list = get(data, ['MRData', 'StandingsTable', 'StandingsLists', 0], {});

    return {
      season: get(data, ['MRData', 'StandingsTable', 'season'], list.season || ''),
      round: get(data, ['MRData', 'StandingsTable', 'round'], list.round || ''),
      standings: (list.ConstructorStandings || []).map(mapConstructorStanding)
    };
  }

  async function getCurrentSchedule() {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, 'current.json'));
    var races = get(data, ['MRData', 'RaceTable', 'Races'], []).map(mapRace);
    return {
      season: get(data, ['MRData', 'RaceTable', 'season'], ''),
      races: races
    };
  }

  async function getNextRaceFromApi() {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, 'current/next.json'));
    var races = get(data, ['MRData', 'RaceTable', 'Races'], []).map(mapRace);
    return {
      season: get(data, ['MRData', 'RaceTable', 'season'], ''),
      race: races[0] || null
    };
  }

  function mapResultRow(row) {
    var driver = row.Driver || {};
    var constructor = row.Constructor || {};
    return {
      position: row.position || '—',
      driverId: driver.driverId,
      givenName: driver.givenName || '',
      familyName: driver.familyName || '',
      name: ((driver.givenName || '') + ' ' + (driver.familyName || '')).trim(),
      code: driver.code || '—',
      team: constructor.name || '—',
      teamId: constructor.constructorId || '',
      points: row.points || '0',
      status: row.status || '',
      grid: row.grid || '',
      laps: row.laps || '',
      time: row.Time ? row.Time.time : '',
      millis: row.Time ? row.Time.millis : ''
    };
  }

  function mapLastRace(race) {
    var results = (race.Results || []).map(mapResultRow);
    var fastest = (race.Results || []).find(function (row) {
      return row.FastestLap && row.FastestLap.rank === '1';
    });
    var fastestLap = fastest && fastest.FastestLap ? fastest.FastestLap : null;
    var fastestDriver = fastest && fastest.Driver ? fastest.Driver : {};

    return {
      season: get(race, ['season'], ''),
      round: race.round || '—',
      name: nomeGP(race.raceName),
      circuitId: get(race, ['Circuit', 'circuitId'], ''),
      circuit: get(race, ['Circuit', 'circuitName'], '—'),
      locality: get(race, ['Circuit', 'Location', 'locality'], ''),
      country: nomePais(get(race, ['Circuit', 'Location', 'country'], '')),
      countryEn: get(race, ['Circuit', 'Location', 'country'], ''),
      date: race.date || '',
      time: race.time || '',
      results: results,
      winner: results[0] || null,
      podium: results.slice(0, 3),
      fastestLap: fastestLap ? {
        time: fastestLap.Time ? fastestLap.Time.time : '',
        driver: ((fastestDriver.givenName || '') + ' ' + (fastestDriver.familyName || '')).trim(),
        averageSpeed: fastestLap.AverageSpeed ? fastestLap.AverageSpeed.speed : ''
      } : null
    };
  }

  async function getLastRaceResults() {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, 'current/last/results.json'));
    var race = get(data, ['MRData', 'RaceTable', 'Races', 0], {});
    return {
      season: get(data, ['MRData', 'RaceTable', 'season'], ''),
      race: mapLastRace(race)
    };
  }

  async function getOpenF1Sessions() {
    return fetchJson(buildUrl(OPENF1_BASE, 'sessions?session_key=latest')).catch(function () {
      return [];
    });
  }

  async function getSeasonSchedule(season) {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, encodeURIComponent(season) + '.json'));
    var races = get(data, ['MRData', 'RaceTable', 'Races'], []).map(mapRace);
    return {
      season: get(data, ['MRData', 'RaceTable', 'season'], season),
      races: races
    };
  }

  async function getSeasonResults(season) {
    var data = await fetchJson(buildUrl(JOLPICA_BASE, encodeURIComponent(season) + '/results/1.json?limit=100'));
    var races = get(data, ['MRData', 'RaceTable', 'Races'], []).map(mapRace);
    return {
      season: get(data, ['MRData', 'RaceTable', 'season'], season),
      races: races
    };
  }

  function getNextRace(races) {
    var now = new Date();
    var upcoming = (races || []).filter(function (race) {
      return race.date && new Date(race.date + 'T' + (race.time || '00:00:00Z')) >= now;
    });
    return upcoming[0] || (races || [])[0] || null;
  }

  global.F1Api = {
    getDriverStandings: getDriverStandings,
    getConstructorStandings: getConstructorStandings,
    getCurrentSchedule: getCurrentSchedule,
    getNextRaceFromApi: getNextRaceFromApi,
    getLastRaceResults: getLastRaceResults,
    getOpenF1Sessions: getOpenF1Sessions,
    getSeasonSchedule: getSeasonSchedule,
    getSeasonResults: getSeasonResults,
    getNextRace: getNextRace,
    nomeGP: nomeGP,
    utils: {
      cleanHexColor: cleanHexColor,
      normalize: normalize
    }
  };
})(window);
