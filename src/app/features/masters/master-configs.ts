import { MasterConfig } from '../../shared/models/master-config.model';

export const BRAND_CONFIG: MasterConfig = {
  title: 'Brands',
  resource: 'brands',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};

export const FABRIC_CONFIG: MasterConfig = {
  title: 'Fabrics',
  resource: 'fabrics',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Lawn, Khaddar, Chiffon' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};

export const COLOR_CONFIG: MasterConfig = {
  title: 'Colors',
  resource: 'colors',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'hexCode', label: 'Hex Code', type: 'text', placeholder: '#RRGGBB' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};

export const SUIT_TYPE_CONFIG: MasterConfig = {
  title: 'Suit Types',
  resource: 'suittypes',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. 2 Piece, 3 Piece, Fabric Roll' },
    { key: 'pieceCount', label: 'Piece Count', type: 'number', placeholder: 'Leave blank if not applicable' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};

export const UNIT_CONFIG: MasterConfig = {
  title: 'Units of Measure',
  resource: 'units',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Piece, Meter, Gaz, Suit' },
    { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. PCS, MTR, GAZ' },
    { key: 'allowsDecimalQuantity', label: 'Allows Decimal Quantity', type: 'checkbox' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};

export const EXPENSE_CATEGORY_CONFIG: MasterConfig = {
  title: 'Expense Categories',
  resource: 'expensecategories',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Rent, Utilities, Salaries' },
    { key: 'isActive', label: 'Active', type: 'checkbox' }
  ]
};
