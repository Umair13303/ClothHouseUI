export interface NavLink {
  key: string;
  path: string | null;
  label: string;
  icon: string | null;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}
