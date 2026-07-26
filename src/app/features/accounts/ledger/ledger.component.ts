import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, Input, OnChanges, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { MenuService } from '../../../core/services/menu.service';
import { PartyAdjustmentDialogComponent } from '../../../shared/components/party-adjustment-dialog/party-adjustment-dialog.component';

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all';

interface PartyDto {
  id: string;
  name: string;
  outstandingBalance: number;
}

interface StoreSettingsDto {
  name: string;
  address: string | null;
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
  | 'Adjustment'
  | 'ChequeBounce'
  | 'WriteOff';

interface KhataRowDto {
  entryId: string;
  entryDate: string;
  entryType: LedgerEntryTypeValue;
  debit: number;
  credit: number;
  runningBalance: number;
  sourceDocumentType: string;
  remarks: string | null;
}

/** ADR-003 §6.1: one khata page — opening line, paged rows, closing balance. */
interface KhataStatementDto {
  partyId: string;
  partyName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  page: number;
  pageSize: number;
  totalRows: number;
  rows: KhataRowDto[];
}

const ENTRY_TYPE_LABELS: Record<LedgerEntryTypeValue, string> = {
  OpeningBalance: 'Opening Balance',
  SalesInvoice: 'Sales Invoice',
  PurchaseInvoice: 'Purchase Invoice',
  Receipt: 'Receipt',
  Payment: 'Payment',
  SalesReturn: 'Sales Return',
  PurchaseReturn: 'Purchase Return',
  Adjustment: 'Adjustment',
  ChequeBounce: 'Cheque Bounce',
  WriteOff: 'Write-off'
};

/** Reuses the app's global .chip-* palette (styles.scss) so the Type column reads at a glance. */
const ENTRY_TYPE_CHIP_CLASS: Record<LedgerEntryTypeValue, string> = {
  OpeningBalance: 'chip-neutral',
  SalesInvoice: 'chip-info',
  PurchaseInvoice: 'chip-info',
  Receipt: 'chip-success',
  Payment: 'chip-success',
  SalesReturn: 'chip-warning',
  PurchaseReturn: 'chip-warning',
  Adjustment: 'chip-neutral',
  ChequeBounce: 'chip-danger',
  WriteOff: 'chip-danger'
};

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './ledger.component.html',
  styleUrl: './ledger.component.scss'
})
export class LedgerComponent implements OnInit, OnChanges {
  /** Set via route `data: { type: 'customer' | 'vendor' }`. */
  @Input() type: 'customer' | 'vendor' = 'customer';
  /** Optional query param `id` — pre-selects a party (e.g. linked from the Customers list). */
  @Input() id: string | null = null;
  /** False when embedded in a dialog, whose own header already shows the title.
   *  Printing is also only offered outside the dialog — see `print()`. */
  @Input() showTitle = true;

  readonly pageSize = 50;

  parties = signal<PartyDto[]>([]);
  statement = signal<KhataStatementDto | null>(null);
  selectedPartyId: string | null = null;
  /** Free-typed text driving the party autocomplete — kept in sync with the selected party's name. */
  partySearchText = '';
  /** yyyy-MM-dd from the date inputs; empty = no lower/upper bound.
   *  Defaulted to the current month in ngOnInit so the statement isn't empty on open. */
  fromDate = '';
  toDate = '';
  page = 1;
  loading = signal(false);
  storeName = signal('');
  storeAddress = signal<string | null>(null);
  readonly today = new Date();
  /** Which quick date-range button (if any) matches the current from/to — cleared on manual edits. */
  activePreset: DatePreset | null = 'month';

  constructor(private http: HttpClient, private dialog: MatDialog, public menuService: MenuService) {}

  ngOnInit(): void {
    const now = new Date();
    this.fromDate = this.toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate = this.toIsoDate(now);

    this.loadParties();
    this.http.get<StoreSettingsDto>(`${environment.apiUrl}/settings/store`).subscribe((s) => {
      this.storeName.set(s.name);
      this.storeAddress.set(s.address);
    });
  }

  /** Local-date yyyy-MM-dd for the date inputs — `toISOString` would shift the day near midnight in +offset zones. */
  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnChanges(): void {
    if (this.id) {
      this.selectedPartyId = this.id;
      this.partySearchText = this.selectedParty?.name ?? '';
    }
  }

  get resource(): string {
    return this.type === 'customer' ? 'customers' : 'vendors';
  }

  get title(): string {
    return this.type === 'customer' ? 'Customer Khata' : 'Vendor Khata';
  }

  get totalPages(): number {
    const s = this.statement();
    return s ? Math.max(1, Math.ceil(s.totalRows / s.pageSize)) : 1;
  }

  /** Live-filtered as the user types in the party search box; shows everyone when it's empty. */
  get filteredParties(): PartyDto[] {
    const q = this.partySearchText.trim().toLowerCase();
    if (!q) return this.parties();
    return this.parties().filter((p) => p.name.toLowerCase().includes(q));
  }

  /** Opening → closing movement for the current range — always accurate regardless of paging. */
  get netChange(): number {
    const s = this.statement();
    return s ? s.closingBalance - s.openingBalance : 0;
  }

  loadParties(): void {
    this.http.get<PartyDto[]>(`${environment.apiUrl}/${this.resource}`).subscribe((data) => {
      this.parties.set(data);
      if (this.id) {
        this.selectedPartyId = this.id;
        this.partySearchText = this.selectedParty?.name ?? '';
        this.loadStatement();
      }
    });
  }

  onPartySelected(event: MatAutocompleteSelectedEvent): void {
    const p = event.option.value as PartyDto;
    this.selectedPartyId = p.id;
    this.partySearchText = p.name;
    this.onPartyChange();
  }

  /** Reverts stray typed text that was never turned into a selection, so the field never shows a mismatch. */
  onPartySearchBlur(): void {
    this.partySearchText = this.selectedParty?.name ?? '';
  }

  onPartyChange(): void {
    this.page = 1;
    this.loadStatement();
  }

  onRangeChange(): void {
    this.activePreset = null;
    this.page = 1;
    this.loadStatement();
  }

  setDatePreset(preset: DatePreset): void {
    const now = new Date();
    switch (preset) {
      case 'today':
        this.fromDate = this.toIsoDate(now);
        this.toDate = this.toIsoDate(now);
        break;
      case 'week': {
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        this.fromDate = this.toIsoDate(monday);
        this.toDate = this.toIsoDate(now);
        break;
      }
      case 'month':
        this.fromDate = this.toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.toDate = this.toIsoDate(now);
        break;
      case 'year':
        this.fromDate = this.toIsoDate(new Date(now.getFullYear(), 0, 1));
        this.toDate = this.toIsoDate(now);
        break;
      case 'all':
        this.fromDate = '';
        this.toDate = '';
        break;
    }
    this.activePreset = preset;
    this.page = 1;
    this.loadStatement();
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(1, page), this.totalPages);
    this.loadStatement();
  }

  loadStatement(): void {
    if (!this.selectedPartyId) {
      this.statement.set(null);
      return;
    }
    this.loading.set(true);
    let params = new HttpParams().set('page', this.page).set('pageSize', this.pageSize);
    if (this.fromDate) params = params.set('from', this.fromDate);
    if (this.toDate) params = params.set('to', this.toDate);

    this.http
      .get<KhataStatementDto>(`${environment.apiUrl}/${this.resource}/${this.selectedPartyId}/khata`, { params })
      .subscribe({
        next: (data) => {
          this.statement.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  /** Only offered on the full page (see template) — printing from inside the
   *  dialog clipped to the dialog's scrollable area and included its chrome. */
  print(): void {
    window.print();
  }

  openAdjustmentDialog(): void {
    const sp = this.selectedParty;
    if (!sp) return;
    this.dialog
      .open(PartyAdjustmentDialogComponent, {
        width: '95vw',
        maxWidth: '680px',
        data: { type: this.type, partyId: sp.id, partyName: sp.name }
      })
      .afterClosed()
      .subscribe(() => this.loadStatement());
  }

  entryTypeLabel(t: LedgerEntryTypeValue): string {
    return ENTRY_TYPE_LABELS[t] ?? '—';
  }

  entryTypeChipClass(t: LedgerEntryTypeValue): string {
    return ENTRY_TYPE_CHIP_CLASS[t] ?? 'chip-neutral';
  }

  get selectedParty(): PartyDto | undefined {
    return this.parties().find((p) => p.id === this.selectedPartyId);
  }

  /** Only a bounded range has a meaningful "balance brought forward" line. */
  get showOpeningLine(): boolean {
    return this.page === 1 && !!this.fromDate;
  }
}
