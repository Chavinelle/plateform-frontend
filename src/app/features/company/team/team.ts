import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentsSection } from './sections/departments-section/departments-section';
import { InvitationsSection } from './sections/invitations-section/invitations-section';
import { MembersSection } from './sections/members-section/members-section';

@Component({
  selector: 'app-team',
  imports: [MembersSection, InvitationsSection, DepartmentsSection],
  templateUrl: './team.html',
  styleUrl: './team.scss'
})
export class Team {
  private auth = inject(AuthService);
  isAdmin = computed(() => this.auth.user()?.role === 'ADMIN_ENTREPRISE');
}
