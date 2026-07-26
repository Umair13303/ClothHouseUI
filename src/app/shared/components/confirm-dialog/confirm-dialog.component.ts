import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Informational popup: hides the cancel button (confirm defaults to "OK"). */
  alertOnly?: boolean;
  /** Overrides the badge icon (defaults to help/delete based on danger). */
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog" [class.danger]="data.danger">
      <div class="icon-badge">
        <mat-icon>{{ data.icon ?? (data.danger ? 'delete_forever' : 'help_outline') }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (!data.alertOnly) {
          <button mat-stroked-button [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Cancel' }}</button>
        }
        <button mat-flat-button [color]="data.danger ? 'warn' : 'primary'" [mat-dialog-close]="true" cdkFocusInitial>
          {{ data.confirmLabel ?? (data.alertOnly ? 'OK' : 'Confirm') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 4px;
    }

    .icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-primary-tint);
      color: var(--color-primary);
      margin-bottom: 12px;
    }

    .danger .icon-badge {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }

    h2[mat-dialog-title] {
      margin: 0 0 4px;
      font-size: 17px;
    }

    mat-dialog-content {
      color: var(--color-text-muted);
      font-size: 14px;
      padding: 0;
    }

    mat-dialog-actions {
      padding: 16px 0 0;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {}
}
