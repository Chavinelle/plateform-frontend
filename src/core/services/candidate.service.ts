import { CandidateDashboard } from '../models/candidate-dashboard.models';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  CandidateProfile, DocumentItem, DocumentType, Education, EducationRequest,
  Experience, ExperienceRequest, Language, LanguageRequest, Skill, SkillRequest,
  UpdateProfileRequest, CompletionResult, ProfileVisibility
} from '../models/candidate.models';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/candidate`;

  /** Droit à l'effacement (11.8) : définitif, la session est refusée dès la requête suivante. */
  eraseAccount(password: string, confirmation: string) {
    return this.http.post<void>(`${this.base}/account/erase`, { password, confirmation });
  }

  /** Tableau de bord du candidat connecté. */
  dashboard() {
    return this.http.get<CandidateDashboard>(`${this.base}/dashboard`);
  }

  // ---- Profil et photo ----
  getProfile() {
    return this.http.get<CandidateProfile>(`${this.base}/profile`);
  }
  updateProfile(body: UpdateProfileRequest) {
    return this.http.put<CandidateProfile>(`${this.base}/profile`, body);
  }
  uploadPhoto(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.put<void>(`${this.base}/profile/photo`, form);
  }
  getPhoto() {
    return this.http.get(`${this.base}/profile/photo`, { responseType: 'blob' });
  }
  deletePhoto() {
    return this.http.delete<void>(`${this.base}/profile/photo`);
  }

  // ---- Expériences ----
  listExperiences() { return this.http.get<Experience[]>(`${this.base}/experiences`); }
  createExperience(b: ExperienceRequest) { return this.http.post<Experience>(`${this.base}/experiences`, b); }
  updateExperience(id: number, b: ExperienceRequest) { return this.http.put<Experience>(`${this.base}/experiences/${id}`, b); }
  deleteExperience(id: number) { return this.http.delete<void>(`${this.base}/experiences/${id}`); }

  // ---- Formations ----
  listEducations() { return this.http.get<Education[]>(`${this.base}/educations`); }
  createEducation(b: EducationRequest) { return this.http.post<Education>(`${this.base}/educations`, b); }
  updateEducation(id: number, b: EducationRequest) { return this.http.put<Education>(`${this.base}/educations/${id}`, b); }
  deleteEducation(id: number) { return this.http.delete<void>(`${this.base}/educations/${id}`); }

  // ---- Compétences ----
  listSkills() { return this.http.get<Skill[]>(`${this.base}/skills`); }
  createSkill(b: SkillRequest) { return this.http.post<Skill>(`${this.base}/skills`, b); }
  updateSkill(id: number, b: SkillRequest) { return this.http.put<Skill>(`${this.base}/skills/${id}`, b); }
  deleteSkill(id: number) { return this.http.delete<void>(`${this.base}/skills/${id}`); }

  // ---- Langues ----
  listLanguages() { return this.http.get<Language[]>(`${this.base}/languages`); }
  createLanguage(b: LanguageRequest) { return this.http.post<Language>(`${this.base}/languages`, b); }
  updateLanguage(id: number, b: LanguageRequest) { return this.http.put<Language>(`${this.base}/languages/${id}`, b); }
  deleteLanguage(id: number) { return this.http.delete<void>(`${this.base}/languages/${id}`); }

  // ---- Documents ----
  listDocuments() {
    return this.http.get<DocumentItem[]>(`${this.base}/documents`);
  }
  uploadDocument(file: File, type: DocumentType) {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return this.http.post<DocumentItem>(`${this.base}/documents`, form);
  }
  downloadDocument(id: number, inline = false) {
    return this.http.get(`${this.base}/documents/${id}/download`, {
      params: { inline },
      responseType: 'blob',
      observe: 'response'
    });
  }
  deleteDocument(id: number) {
    return this.http.delete<void>(`${this.base}/documents/${id}`);
  }
  setDefaultDocument(id: number) {
    return this.http.put<DocumentItem>(`${this.base}/documents/${id}/default`, {});
  }

  getCompletion() {
  return this.http.get<CompletionResult>(`${this.base}/profile/completion`);
}
 updateVisibility(visibility: ProfileVisibility) {
  return this.http.put<CandidateProfile>(`${this.base}/profile/visibility`, { visibility });
}
}
