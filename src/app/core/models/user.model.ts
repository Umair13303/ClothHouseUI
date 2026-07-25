export interface User {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface AdminUser extends User {
  isActive: boolean;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  fullName: string;
  password: string;
  role: string;
}
