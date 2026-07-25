import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { MasterField } from '../../models/master-config.model';

export interface QuickAddDialogData {
  /** Dialog title, e.g. "New Brand". */
  title: string;
  /** API resource segment, e.g. "brands" -> POST {apiUrl}/brands. */
  resource: string;
  /** Same field metadata shape the Masters screens use, so any lookup's config can be reused as-is. */
  fields: MasterField[];
  /** Icon shown in the header badge. Defaults to "add_circle". */
  icon?: string;
}

/**
 * Generic "quick add" dialog: renders a small form driven by MasterField[],
 * POSTs it to the given resource, and closes returning the created record
 * so the caller can drop it straight into a dropdown's option list.
 *
 * Always creates (never edits), so an `isActive` field is set to true in the
 * payload but never shown as a toggle — there's nothing to deactivate yet.
 */
@Component({
  selector: 'app-quick-add-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatIconModule],
  template: `
    <div class="quick-add-header">
      <span class="icon-badge"><mat-icon>{{ data.icon ?? 'add_circle' }}</mat-icon></span>
      <h2 mat-dialog-title>{{ data.title }}</h2>
    </div>
    <mat-dialog-content>
      <form id="quickAddForm" (ngSubmit)="save()" class="form-grid">
        @for (field of displayFields; track field.key) {
          @switch (field.type) {
            @case ('number') {
              <mat-form-field appearance="outline">
                <mat-label>{{ field.label }}</mat-label>
                <input matInput type="number" [(ngModel)]="model[field.key]" [name]="field.key" [placeholder]="field.placeholder ?? ''" />
              </mat-form-field>
            }
            @case ('textarea') {
              <mat-form-field appearance="outline" class="span-2">
                <mat-label>{{ field.label }}</mat-label>
                <textarea matInput rows="2" [(ngModel)]="model[field.key]" [name]="field.key" [placeholder]="field.placeholder ?? ''"></textarea>
              </mat-form-field>
            }
            @default {
              <mat-form-field appearance="outline" [class.span-2]="displayFields.length === 1">
                <mat-label>{{ field.label }}</mat-label>
                <input matInput type="text" [(ngModel)]="model[field.key]" [name]="field.key" [required]="!!field.required" [placeholder]="field.placeholder ?? ''" />
              </mat-form-field>
            }
          }
        }
      </form>
      @if (errorMessage) {
        <div class="quick-add-error">{{ errorMessage }}</div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-stroked-button [mat-dialog-close]="null">Cancel</button>
      <button type="submit" form="quickAddForm" mat-flat-button color="primary" [disabled]="saving">
        {{ saving ? 'Saving…' : 'Save & Select' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .quick-add-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px;
    }

    .icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-primary-tint);
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h2[mat-dialog-title] {
      margin: 0;
    }

    mat-dialog-content {
      min-width: 360px;
      padding-top: 4px;
    }

    .form-grid {
      margin-top: 8px;
    }

    .quick-add-error {
      color: var(--color-danger);
      font-size: 13px;
      margin-top: 8px;
    }
  `]
})
export class QuickAddDialogComponent {
  /** Every lookup's create form defaults to active — no toggle needed here. */
  displayFields: MasterField[];
  model: Record<string, any> = {};
  saving = false;
  errorMessage: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QuickAddDialogData,
    private dialogRef: MatDialogRef<QuickAddDialogComponent>,
    private http: HttpClient
  ) {
    this.displayFields = data.fields.filter((f) => f.key !== 'isActive');
    for (const field of data.fields) {
      this.model[field.key] = field.type === 'checkbox' ? true : field.type === 'number' ? null : '';
    }
  }

  save(): void {
    this.errorMessage = null;
    this.saving = true;
    this.http.post<Record<string, any>>(`${environment.apiUrl}/${this.data.resource}`, this.model).subscribe({
      next: (created) => {
        this.saving = false;
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error ?? 'Save failed. Please check the form and try again.';
      }
    });
  }
}
