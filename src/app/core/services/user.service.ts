import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUser, CreateUserRequest, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private readonly authUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.usersUrl);
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.authUrl}/register`, request);
  }

  setActive(userId: string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.usersUrl}/${userId}/active`, { isActive });
  }
}
