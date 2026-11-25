import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthUser, LoginRequest, LoginResponse, MessageResponse,
  RegisterCandidateRequest, RegisterCompanyRequest
} from '../models/auth.models';
import {
  AcceptInvitationRequest, InvitationPreview
} from '../models/company.models';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/auth`;

  private _user = signal<AuthUser | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(body: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.api}/login`, body).pipe(
      tap(res => {
        const user: AuthUser = {
          userId: res.userId, email: res.email,
          firstName: res.firstName, lastName: res.lastName, role: res.role
        };
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._user.set(user);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  registerCandidate(body: RegisterCandidateRequest) {
    return this.http.post<unknown>(`${this.api}/register/candidate`, body);
  }

  registerCompany(body: RegisterCompanyRequest) {
    return this.http.post<unknown>(`${this.api}/register/company`, body);
  }

  verifyEmail(email: string, code: string) {
    return this.http.post<MessageResponse>(`${this.api}/verify-email`, { email, code });
  }

  resendVerification(email: string) {
    return this.http.post<MessageResponse>(`${this.api}/resend-verification`, { email });
  }

  forgotPassword(email: string) {
    return this.http.post<MessageResponse>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string) {
    return this.http.post<MessageResponse>(`${this.api}/reset-password`, { email, code, newPassword });
  }

  updateStoredUser(firstName: string, lastName: string) {
  const current = this._user();
  if (!current) return;
  const updated: AuthUser = { ...current, firstName, lastName };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
  this._user.set(updated);
  }
  hasValidSession(): boolean {
  const token = this.token();
  if (!token) return false;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (payload.exp * 1000 < Date.now()) {
      this.logout();
      return false;
    }
    return true;
  } catch {
    this.logout();
    return false;
  }
}

  private readStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  getInvitation(token: string) {
  return this.http.get<InvitationPreview>(`${this.api}/invitations/${encodeURIComponent(token)}`);
}

acceptInvitation(body: AcceptInvitationRequest) {
  return this.http.post<unknown>(`${this.api}/invitations/accept`, body);
}
}
