import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { PipelineEditor } from '../jobs/pipeline-editor/pipeline-editor';

@Component({
  selector: 'app-company-pipeline',
  imports: [PipelineEditor],
  templateUrl: './company-pipeline.html',
  styleUrl: './company-pipeline.scss'
})
export class CompanyPipeline {
  private auth = inject(AuthService);
  isManager = computed(() => this.auth.user()?.role === 'MANAGER');
}
