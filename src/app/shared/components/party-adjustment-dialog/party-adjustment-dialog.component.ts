import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { CancelPromptService } from '../../../core/services/cancel-prompt.service';

export interface PartyAdjustmentDialogData {
  type: 'customer' | 'vendor';
  partyId: string;
  partyName: string;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type AdjustmentTypeValue = 'OpeningBalance' | 'WriteOff' | 'Correction' | 'Discount';
type DirectionValue = 'IncreasesBalance' | 'DecreasesBalance';
type StatusValue = 'Confirmed' | 'Cancelled';

interface PartyLedgerAdjustmentDto {
  id: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  adjustmentType: AdjustmentTypeValue;
  amount: number;
  direction: DirectionValue;
  status: StatusValue;
  remarks: string | null;
}

const ADJUSTMENT_TYPES: { value: AdjustmentTypeValue; label: string }[] = [
  { value: 'OpeningBalance', label: 'Opening Balance' },
  { value: 'Correction', label: 'Correction' },
  { value: 'WriteOff', label: 'Write-off' },
  { value: 'Discount', label: 'Discount' }
];

/** ADR-003 B4: opening balances, write-offs, corrections — entered "inside the khata views". */
@Component({
  selector: 'app-party-adjustment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatTooltipModule
  ],
  templateUrl: './party-adjustment-dialog.component.html',
  styleUrl: './party-adjustment-dialog.component.scss'
})
export class PartyAdjustmentDialogComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/party-adjustments`;

  adjustmentTypes = ADJUSTMENT_TYPES;
  existing = signal<PartyLedgerAdjustmentDto[]>([]);
  loading = signal(false);
  saving = signal(false);

  adjustmentType: AdjustmentTypeValue = 'Correction';
  direction: DirectionValue = 'IncreasesBalance';
  amount: number | null = null;
  adjustmentDate = new Date().toISOString().slice(0, 10);
  remarks = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PartyAdjustmentDialogData,
    private http: HttpClient,
    private notify: NotificationService,
    private cancelPrompt: CancelPromptService
  ) {}

  ngOnInit(): void {
    this.loadExisting();
  }

  get remarksRequired(): boolean {
    return this.adjustmentType === 'Correction' || this.adjustmentType === 'WriteOff';
  }

  get increasesLabel(): string {
    return this.data.type === 'customer' ? 'Increases what they owe' : 'Increases what we owe them';
  }

  get decreasesLabel(): string {
    return this.data.type === 'customer' ? 'Decreases what they owe' : 'Decreases what we owe them';
  }

  loadExisting(): void {
    this.loading.set(true);
    const partyType = this.data.type === 'customer' ? 'Customer' : 'Vendor';
    this.http
      .get<PartyLedgerAdjustmentDto[]>(this.baseUrl, { params: { partyType, partyId: this.data.partyId } })
      .subscribe({
        next: (data) => {
          this.existing.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  submit(): void {
    if (!this.amount || this.amount <= 0) {
      this.notify.error('Enter a positive amount.');
      return;
    }
    if (this.remarksRequired && !this.remarks.trim()) {
      this.notify.error('Remarks are required for a correction or write-off.');
      return;
    }

    this.saving.set(true);
    const payload = {
      adjustmentDate: this.adjustmentDate,
      partyType: this.data.type === 'customer' ? 'Customer' : 'Vendor',
      customerId: this.data.type === 'customer' ? this.data.partyId : null,
      vendorId: this.data.type === 'vendor' ? this.data.partyId : null,
      adjustmentType: this.adjustmentType,
      amount: this.amount,
      direction: this.direction,
      remarks: this.remarks || null
    };

    this.http.post(this.baseUrl, payload).subscribe({
      next: () => {
        this.notify.success('Adjustment posted.');
        this.saving.set(false);
        this.resetForm();
        this.loadExisting();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post adjustment.');
        this.saving.set(false);
      }
    });
  }

  cancel(a: PartyLedgerAdjustmentDto): void {
    this.cancelPrompt
      .ask({ title: 'Cancel this adjustment?', message: `${a.adjustmentNumber}, ${a.amount}. This reverses it on the khata and cannot be undone.` })
      .subscribe((reason) => {
        if (!reason) return;
        this.http.post(`${this.baseUrl}/${a.id}/cancel`, { reason }).subscribe({
          next: () => {
            this.notify.success('Adjustment cancelled.');
            this.loadExisting();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Failed to cancel adjustment.')
        });
      });
  }

  typeLabel(t: AdjustmentTypeValue): string {
    return this.adjustmentTypes.find((x) => x.value === t)?.label ?? t;
  }

  private resetForm(): void {
    this.adjustmentType = 'Correction';
    this.direction = 'IncreasesBalance';
    this.amount = null;
    this.remarks = '';
  }
}
