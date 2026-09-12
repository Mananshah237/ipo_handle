import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import IPOTable from '../components/IPOTable';
import { emptyState, member } from '../lib/family';

afterEach(cleanup);

it('expands an IPO row and preserves member checkbox behavior', () => {
  const person = member('Mother', 'ABCDE' + String(1234) + 'F');
  const onApplied = vi.fn();
  render(<IPOTable ipos={[{ id: 'sample', name: 'Sample IPO', gmp: 20, priceMax: 100 }]} state={{ ...emptyState(), members: [person] }} currentDate={new Date('2026-09-12')} onApplied={onApplied}/>);
  expect(screen.getByRole('columnheader', { name: 'Company' })).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: 'Mother' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Sample IPO' }));
  expect(screen.getByRole('button', { name: 'Sample IPO' }).getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mother' }));
  expect(onApplied).toHaveBeenCalledWith('sample', person.id, true);
  fireEvent.click(screen.getByRole('button', { name: 'Sample IPO' }));
  expect(screen.queryByRole('checkbox', { name: 'Mother' })).toBeNull();
});

it('shows missing allotment values and the applied family in a table', () => {
  const person = member('Mother', 'ABCDE' + String(1234) + 'F');
  render(<IPOTable allotments ipos={[{ id: 'sample', name: 'Sample IPO' }]} state={{ ...emptyState(), members: [person], applications: { sample: { [person.id]: { applied: true } } } }} currentDate={new Date('2026-09-12')} onApplied={() => {}}/>);
  expect(screen.getByRole('columnheader', { name: 'Allotment date' })).toBeTruthy();
  expect(screen.getByText('Mother')).toBeTruthy();
  expect(screen.getAllByText('Not available')).toHaveLength(3);
});
