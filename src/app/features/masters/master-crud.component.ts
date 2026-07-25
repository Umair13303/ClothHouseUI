import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { MasterConfig } from '../../shared/models/master-config.model';
import { ConfirmService } from '../../core/services/confirm.service';
import { MenuService } from '../../core/services/menu.service';
import { NotificationService } from '../../core/services/notification.service';

type MasterRecord = Record<string, any> & { id?: string };

/**
 * Generic list + inline add/edit form + delete for the simple lookup
 * masters. The active MasterConfig is bound from route data (see
 * app.routes.ts and withComponentInputBinding()).
 */
@Component({
  selector: 'app-master-crud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ],
  templateUrl: './master-crud.component.html',
  styleUrl: './master-crud.component.scss'
})
export class MasterCrudComponent implements OnInit {
  @Input() config!: MasterConfig;

  items = signal<MasterRecord[]>([]);
  loading = signal(false);
  includeInactive = signal(false);

  editingId: string | null = null;
  formModel: MasterRecord = {};
  showForm = false;

  constructor(
    private http: HttpClient,
    private confirmDialog: ConfirmService,
    private notify: NotificationService,
    public menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private get baseUrl(): string {
    return `${environment.apiUrl}/${this.config.resource}`;
  }

  load(): void {
    this.loading.set(true);
    this.http
      .get<MasterRecord[]>(`${this.baseUrl}?includeInactive=${this.includeInactive()}`)
      .subscribe({
        next: (data) => {
          this.items.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Failed to load records.');
          this.loading.set(false);
        }
      });
  }

  toggleIncludeInactive(): void {
    this.includeInactive.set(!this.includeInactive());
    this.load();
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = this.defaultModel();
    this.showForm = true;
  }

  startEdit(item: MasterRecord): void {
    this.editingId = item['id'] ?? null;
    this.formModel = { ...item };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  save(): void {
    const payload = this.buildPayload();

    const request$ = this.editingId
      ? this.http.put<MasterRecord>(`${this.baseUrl}/${this.editingId}`, payload)
      : this.http.post<MasterRecord>(this.baseUrl, payload);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.notify.success(this.editingId ? 'Record updated.' : 'Record created.');
        this.load();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Save failed. Please check the form and try again.');
      }
    });
  }

  remove(item: MasterRecord): void {
    this.confirmDialog
      .ask({
        title: `Delete ${this.config.title.slice(0, -1).toLowerCase()}?`,
        message: `Delete "${item['name']}"? This can be restored later by an administrator if needed.`,
        confirmLabel: 'Delete',
        danger: true
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${this.baseUrl}/${item['id']}`).subscribe({
          next: () => {
            this.notify.success('Record deleted.');
            this.load();
          },
          error: () => this.notify.error('Delete failed.')
        });
      });
  }

  private defaultModel(): MasterRecord {
    const model: MasterRecord = {};
    for (const field of this.config.fields) {
      model[field.key] = field.type === 'checkbox' ? true : field.type === 'number' ? null : '';
    }
    return model;
  }

  private buildPayload(): MasterRecord {
    const payload: MasterRecord = {};
    for (const field of this.config.fields) {
      payload[field.key] = this.formModel[field.key];
    }
    return payload;
  }
}
