import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CompanyImageSlot, CompanyInfo, UpdateCompanyRequest } from '../models/company.models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/company`;

  getProfile() {
    return this.http.get<CompanyInfo>(`${this.base}/profile`);
  }
  updateProfile(body: UpdateCompanyRequest) {
    return this.http.put<CompanyInfo>(`${this.base}/profile`, body);
  }

  // logo et bannière
  uploadImage(slot: CompanyImageSlot, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<void>(`${this.base}/${slot}`, form);
  }
  getImage(slot: CompanyImageSlot) {
    return this.http.get(`${this.base}/${slot}`, { responseType: 'blob' });
  }
  deleteImage(slot: CompanyImageSlot) {
    return this.http.delete<void>(`${this.base}/${slot}`);
  }
}
