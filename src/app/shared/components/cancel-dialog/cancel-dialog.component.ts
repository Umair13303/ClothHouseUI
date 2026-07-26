import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface CancelDialogData {
  title: string;
  message: string;
}

/** ADR-003 B8: every money-document cancel requires a reason — this is the one place that captures it. */
@Component({
  selector: 'app-cancel-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="cancel-dialog">
      <div class="icon-badge">
        <mat-icon>cancel</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
        <mat-form-field appearance="outline" class="reason-field">
          <mat-label>Reason for cancellation</mat-label>
          <textarea matInput [(ngModel)]="reason" name="reason" rows="3" required cdkFocusInitial></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button [mat-dialog-close]="null">Keep it</button>
        <button mat-flat-button color="warn" [disabled]="!reason.trim()" (click)="confirm()">Cancel document</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cancel-dialog {
      padding: 4px;
    }

    .icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-danger-bg);
      color: var(--color-danger);
      margin-bottom: 12px;
    }

    h2[mat-dialog-title] {
      margin: 0 0 4px;
      font-size: 17px;
    }

    .message {
      color: var(--color-text-muted);
      font-size: 14px;
      margin: 0 0 12px;
    }

    .reason-field {
      width: 100%;
    }

    mat-dialog-content {
      padding: 0;
    }

    mat-dialog-actions {
      padding: 16px 0 0;
    }
  `]
})
export class CancelDialogComponent {
  reason = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: CancelDialogData, private dialogRef: MatDialogRef<CancelDialogComponent>) {}

  confirm(): void {
    if (!this.reason.trim()) return;
    this.dialogRef.close(this.reason.trim());
  }
}
