import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';

interface PartyDto {
  id: string;
  name: string;
  outstandingBalance: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type LedgerEntryTypeValue =
  | 'OpeningBalance'
  | 'SalesInvoice'
  | 'PurchaseInvoice'
  | 'Receipt'
  | 'Payment'
  | 'SalesReturn'
  | 'PurchaseReturn'
  | 'Adjustment';

interface LedgerEntryDto {
  id: string;
  entryDate: string;
  entryType: LedgerEntryTypeValue;
  debit: number;
  credit: number;
  runningBalance: number;
  sourceDocumentType: string;
  remarks: string | null;
}

const ENTRY_TYPE_LABELS: Record<LedgerEntryTypeValue, string> = {
  OpeningBalance: 'Opening Balance',
  SalesInvoice: 'Sales Invoice',
  PurchaseInvoice: 'Purchase Invoice',
  Receipt: 'Receipt',
  Payment: 'Payment',
  SalesReturn: 'Sales Return',
  PurchaseReturn: 'Purchase Return',
  Adjustment: 'Adjustment'
};

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './ledger.component.html',
  styleUrl: './ledger.component.scss'
})
export class LedgerComponent implements OnInit, OnChanges {
  /** Set via route `data: { type: 'customer' | 'vendor' }`. */
  @Input() type: 'customer' | 'vendor' = 'customer';
  /** Optional query param `id` — pre-selects a party (e.g. linked from the Customers list). */
  @Input() id: string | null = null;
  /** False when embedded in a dialog, whose own header already shows the title. */
  @Input() showTitle = true;

  parties = signal<PartyDto[]>([]);
  entries = signal<LedgerEntryDto[]>([]);
  selectedPartyId: string | null = null;
  loading = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadParties();
  }

  ngOnChanges(): void {
    if (this.id) this.selectedPartyId = this.id;
  }

  get resource(): string {
    return this.type === 'customer' ? 'customers' : 'vendors';
  }

  get title(): string {
    return this.type === 'customer' ? 'Customer Ledger' : 'Vendor Ledger';
  }

  loadParties(): void {
    this.http.get<PartyDto[]>(`${environment.apiUrl}/${this.resource}`).subscribe((data) => {
      this.parties.set(data);
      if (this.id) {
        this.selectedPartyId = this.id;
        this.loadLedger();
      }
    });
  }

  onPartyChange(): void {
    this.loadLedger();
  }

  loadLedger(): void {
    if (!this.selectedPartyId) {
      this.entries.set([]);
      return;
    }
    this.loading.set(true);
    this.http.get<LedgerEntryDto[]>(`${environment.apiUrl}/${this.resource}/${this.selectedPartyId}/ledger`).subscribe({
      next: (data) => {
        this.entries.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  entryTypeLabel(t: LedgerEntryTypeValue): string {
    return ENTRY_TYPE_LABELS[t] ?? '—';
  }

  get selectedParty(): PartyDto | undefined {
    return this.parties().find((p) => p.id === this.selectedPartyId);
  }
}
