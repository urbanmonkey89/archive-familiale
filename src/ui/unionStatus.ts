import type { UnionStatus } from '../data/schema';

export const STATUS_LABEL: Record<UnionStatus, string> = {
  married: 'Mariés',
  partner: 'En couple',
  divorced: 'Divorcés',
  widowed: 'Veuvage',
  separated: 'Séparés',
  unknown: 'Union',
};

export const STATUS_OPTIONS: UnionStatus[] = ['married', 'partner', 'divorced', 'separated', 'widowed', 'unknown'];

export function statusColor(s: UnionStatus): string {
  switch (s) {
    case 'divorced':
    case 'separated':
      return 'var(--danger)';
    case 'widowed':
    case 'unknown':
      return 'var(--widowed)';
    default:
      return 'var(--accent)';
  }
}

export function statusDashed(s: UnionStatus): boolean {
  return s === 'divorced' || s === 'separated' || s === 'widowed';
}
