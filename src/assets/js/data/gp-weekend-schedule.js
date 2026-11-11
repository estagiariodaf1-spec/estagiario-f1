(function (global) {
  'use strict';

  global.GpWeekendSchedule = {
    villeneuve: {
      timezone: 'America/Sao_Paulo',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '14:30', end: '15:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '18:00', end: '19:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '14:30', end: '15:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '12:00', end: '13:00' },
        { key: 'sprint', label: 'Sprint', day: 'sabado', start: '16:00', end: '17:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '14:00', end: '16:00' }
      ]
    },
    monaco: {
      timezone: 'Europe/Monaco',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '13:30', end: '14:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '17:00', end: '18:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '14:30', end: '15:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '16:00', end: '17:00' },
        { key: 'sprint', label: 'Sprint', day: 'sabado', start: '16:00', end: '17:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '16:00', end: '17:00' }
      ]
    },
    silverstone: {
      timezone: 'Europe/London',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '14:30', end: '15:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '18:00', end: '19:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '14:30', end: '15:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '15:00', end: '16:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '16:00', end: '17:00' }
      ]
    },
    interlagos: {
      timezone: 'America/Sao_Paulo',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '14:30', end: '15:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '18:00', end: '19:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '14:30', end: '15:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '12:00', end: '13:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '14:00', end: '17:00' }
      ]
    },
    spa: {
      timezone: 'Europe/Brussels',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '14:30', end: '15:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '18:00', end: '19:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '15:30', end: '16:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '16:00', end: '17:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '16:00', end: '17:00' }
      ]
    },
    imola: {
      timezone: 'Europe/Rome',
      sessions: [
        { key: 'fp1', label: 'TL1', day: 'sexta', start: '14:30', end: '15:30' },
        { key: 'fp2', label: 'TL2', day: 'sexta', start: '18:00', end: '19:00' },
        { key: 'fp3', label: 'TL3', day: 'sabado', start: '14:30', end: '15:30' },
        { key: 'qualifying', label: 'Classificação', day: 'sabado', start: '16:00', end: '17:00' },
        { key: 'race', label: 'Corrida', day: 'domingo', start: '16:00', end: '17:00' }
      ]
    }
  };
})(window);