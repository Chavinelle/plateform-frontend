import { Component, OnInit, computed, inject } from '@angular/core';
import { ProfileCompletionService } from './../../../../../core/services/profile-completion.service';

@Component({
  selector: 'app-completion-card',
  imports: [],
  templateUrl: './completion-card.html',
  styleUrl: './completion-card.scss'
})
export class CompletionCard implements OnInit {
  completion = inject(ProfileCompletionService);
  missing = computed(() => this.completion.data()?.items.filter(i => !i.done) ?? []);

  ngOnInit() {
    this.completion.refresh();
  }
}
