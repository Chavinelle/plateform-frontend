import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CompanyRole, Department, Invitation, Member } from '../models/company.models';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company`;

  // ---- Membres ----
  listMembers() {
    return this.http.get<Member[]>(`${this.base}/members`);
  }
  changeRole(userId: number, role: CompanyRole) {
    return this.http.put<Member>(`${this.base}/members/${userId}/role`, { role });
  }
  removeMember(userId: number) {
    return this.http.delete<void>(`${this.base}/members/${userId}`);
  }

  // ---- Invitations ----
  listInvitations() {
    return this.http.get<Invitation[]>(`${this.base}/invitations`);
  }
  invite(email: string, role: CompanyRole) {
    return this.http.post<Invitation>(`${this.base}/invitations`, { email, role });
  }
  resendInvitation(id: number) {
    return this.http.post<Invitation>(`${this.base}/invitations/${id}/resend`, {});
  }
  cancelInvitation(id: number) {
    return this.http.delete<void>(`${this.base}/invitations/${id}`);
  }

  // ---- Services ----
  listDepartments() {
    return this.http.get<Department[]>(`${this.base}/departments`);
  }
  createDepartment(name: string) {
    return this.http.post<Department>(`${this.base}/departments`, { name });
  }
  updateDepartment(id: number, name: string) {
    return this.http.put<Department>(`${this.base}/departments/${id}`, { name });
  }
  deleteDepartment(id: number) {
    return this.http.delete<void>(`${this.base}/departments/${id}`);
  }
}
