import '@testing-library/jest-dom';

// Las disciplinas vienen del back: en los tests ya están cargadas, como si se hubieran leído.
import { disciplinas, disciplinasListas } from './stores/disciplinas.js';
import { DISCIPLINAS_FIXTURE } from './__tests__/__mocks__/disciplinas.js';
disciplinas.set(DISCIPLINAS_FIXTURE);
disciplinasListas.set(true);
