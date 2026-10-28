import { expect, it } from 'vitest';
import { hasTaxNumber } from '../src';

it('Steuernummer erscheint nur, wenn tatsächlich erteilt – nie leer oder als Platzhalter', () => {
  expect(hasTaxNumber('')).toBe(false);
  expect(hasTaxNumber('  ')).toBe(false);
  expect(hasTaxNumber('000/000/00000')).toBe(false);
  expect(hasTaxNumber('153/123/45678')).toBe(true);
});
