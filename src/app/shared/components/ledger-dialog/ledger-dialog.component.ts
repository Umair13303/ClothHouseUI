import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LedgerComponent } from '../../../features/accounts/ledger/ledger.component';

export interface LedgerDialogData {
  type: 'customer' | 'vendor';
  id: string;
}

/** Opens the Customer/Vendor ledger in a modal instead of navigating away from the list page. */
@Component({
  selector: 'app-ledger-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, LedgerComponent],
  template: `
    <div class="dialog-header">
      <span class="icon-badge"><mat-icon>account_balance_wallet</mat-icon></span>
      <h2 mat-dialog-title>{{ data.type === 'customer' ? 'Customer Ledger' : 'Vendor Ledger' }}</h2>
    </div>
    <mat-dialog-content>
      <app-ledger [type]="data.type" [id]="data.id" [showTitle]="false"></app-ledger>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" [mat-dialog-close]="null">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
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
      min-width: 640px;
      padding-top: 4px;
    }
  `]
})
export class LedgerDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: LedgerDialogData) {}
}
