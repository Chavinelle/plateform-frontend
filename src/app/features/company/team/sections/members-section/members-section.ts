import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  COMPANY_ROLES, CompanyRole, MEMBER_STATUS_LABELS, Member, MemberStatus, roleLabel
} from '../../../../../../core/models/company.models';
import { AuthService } from '../../../../../../core/services/auth.service';
import { TeamService } from '../../../../../../core/services/team.service';
import { extractErrorMessage } from '../../../../../../core/utils/http-error';
import { Loading } from '../../../../../shared/loading/loading';

@Component({
  selector: 'app-members-section',
  imports: [Loading, ],
  templateUrl: './members-section.html',
  styleUrl: './members-section.scss'
})
export class MembersSection implements OnInit {
  private api = inject(TeamService);
  private auth = inject(AuthService);

  members = signal<Member[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  roles = COMPANY_ROLES;
  roleLabel = roleLabel;
  canManage = computed(() => this.auth.user()?.role === 'ADMIN_ENTREPRISE');

  ngOnInit() {
    this.reload();
  }

  statusLabel(status: MemberStatus): string {
    return MEMBER_STATUS_LABELS[status] ?? status;
  }

  changeRole(member: Member, event: Event) {
    const role = (event.target as HTMLSelectElement).value as CompanyRole;
    this.error.set(null);
    this.api.changeRole(member.id, role).subscribe({
      next: updated => this.members.update(list => list.map(m => (m.id === updated.id ? updated : m))),
      error: err => {
        this.error.set(extractErrorMessage(err));
        this.reload();                       // on remet la liste d'accord avec le serveur
      }
    });
  }

  remove(member: Member) {
    if (!confirm(`Retirer ${member.firstName} ${member.lastName} de l'équipe ? Son compte sera désactivé.`)) return;
    this.error.set(null);
    this.api.removeMember(member.id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(extractErrorMessage(err))
    });
  }

  private reload() {
    this.api.listMembers().subscribe({
      next: list => {
        this.members.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err));
      }
    });
  }
}
