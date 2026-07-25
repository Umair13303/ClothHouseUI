export type MasterFieldType = 'text' | 'textarea' | 'checkbox' | 'number';

export interface MasterField {
  key: string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  placeholder?: string;
}

/**
 * Drives the generic MasterCrudComponent so the six simple lookup masters
 * (Brand, Fabric, Unit of Measure, Suit Type, Color — Category is excluded
 * because it needs a parent-category picker and gets its own screen) share
 * one list+form implementation instead of five near-identical components.
 */
export interface MasterConfig {
  title: string;
  resource: string;
  fields: MasterField[];
}
