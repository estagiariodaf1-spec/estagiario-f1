(function (global) {
  'use strict';

  // Dados que a Jolpica/Ergast não entrega. As chaves seguem o circuitId da API.
  global.F1CircuitDetails = {
    villeneuve: {
      lengthKm: '4,361 km',
      laps: 70,
      raceDistance: '305,270 km',
      lapRecord: '1:13.078 — Valtteri Bottas, 2019',
      drsZones: 3,
      direction: 'Horário',
      notes: 'Setor final e reta dos boxes favorecem ultrapassagens com DRS.'
    },
    monaco: {
      lengthKm: '3,337 km',
      laps: 78,
      raceDistance: '260,286 km',
      lapRecord: '1:12.909 — Lewis Hamilton, 2021',
      drsZones: 1,
      direction: 'Horário',
      notes: 'Poucas zonas de DRS; qualificação define o fim de semana.'
    },
    silverstone: {
      lengthKm: '5,891 km',
      laps: 52,
      raceDistance: '306,198 km',
      lapRecord: '1:27.097 — Max Verstappen, 2020',
      drsZones: 2
    },
    spa: {
      lengthKm: '7,004 km',
      laps: 44,
      raceDistance: '308,052 km',
      lapRecord: '1:46.286 — Valtteri Bottas, 2018',
      drsZones: 2
    },
    monza: {
      lengthKm: '5,793 km',
      laps: 53,
      raceDistance: '306,720 km',
      lapRecord: '1:21.046 — Rubens Barrichello, 2004',
      drsZones: 2
    },
    interlagos: {
      lengthKm: '4,309 km',
      laps: 71,
      raceDistance: '305,879 km',
      lapRecord: '1:10.540 — Valtteri Bottas, 2018',
      drsZones: 2,
      direction: 'Anti-horário',
      notes: 'Subida do S do Senna e descida da Reta Oposta são marcas do traçado.'
    },
    yas_marina: {
      lengthKm: '5,281 km',
      laps: 58,
      raceDistance: '306,183 km',
      lapRecord: '1:26.103 — Max Verstappen, 2021',
      drsZones: 2
    }
  };
})(window);
