export interface Role {
  id: string;
  name: string;
}

export interface RolePermission {
  menuItemId: string;
  menuKey: string;
  label: string;
  parentId: string | null;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UpdateRolePermissionItem {
  menuItemId: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MenuItemAdmin {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  parentId: string | null;
  displayOrder: number;
}
