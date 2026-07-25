import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface VariantSearchResult {
  id: string;
  productId: string;
  productName: string;
  designNumber: string;
  colorId: string | null;
  colorName: string | null;
  unitOfMeasureId: string;
  unitOfMeasureName: string;
  barcode: string;
  defaultSalePrice: number;
  lastPurchasePrice: number;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
}

/**
 * Reusable "scan or search a product variant" input, backed by
 * GET /api/productvariants/search (matches barcode, design number or
 * product name) and GET /api/productvariants/by-barcode/{code} for exact
 * scanner input. Used by Opening Stock, Stock Adjustment, Purchase Invoice
 * and the POS screen so barcode-scanner behavior stays consistent everywhere.
 */
@Component({
  selector: 'app-variant-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <mat-form-field appearance="outline" class="picker">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [(ngModel)]="term"
        (ngModelChange)="onTermChange($event)"
        (keydown.enter)="onEnter()"
        [matAutocomplete]="auto"
        placeholder="Scan barcode or search design/product" />
      <mat-icon matSuffix>qr_code_scanner</mat-icon>
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="select($event.option.value)">
        @for (r of results; track r.id) {
          <mat-option [value]="r">{{ r.productName }} — {{ r.designNumber }} @if (r.colorName) { ({{ r.colorName }}) } · {{ r.barcode }} · Stock: {{ r.currentStock }}</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [
    `
      .picker {
        width: 100%;
      }
    `
  ]
})
export class VariantPickerComponent {
  @Output() variantSelected = new EventEmitter<VariantSearchResult>();

  label = 'Product / Barcode';
  term = '';
  results: VariantSearchResult[] = [];
  private termChanges = new Subject<string>();

  constructor(private http: HttpClient) {
    this.termChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          if (typeof term !== 'string' || term.trim().length < 1) return of([]);
          return this.http
            .get<VariantSearchResult[]>(`${environment.apiUrl}/productvariants/search`, {
              params: { term, maxResults: 15 }
            })
            .pipe(catchError(() => of([])));
        })
      )
      .subscribe((results) => (this.results = results ?? []));
  }

  /** Selecting an option would otherwise write the raw VariantSearchResult
   * object into the input via ngModel (MatAutocomplete's default display
   * behavior without this), which then poisons the search pipeline the next
   * time it's typed into — select() clears the term right after anyway. */
  displayFn = (): string => '';

  onTermChange(term: string): void {
    this.termChanges.next(term);
  }

  onEnter(): void {
    // Barcode scanners emit an Enter keystroke after the code — try an exact
    // barcode match first so scanning works even before the debounce fires.
    const code = this.term.trim();
    if (!code) return;
    this.http.get<VariantSearchResult>(`${environment.apiUrl}/productvariants/by-barcode/${encodeURIComponent(code)}`).subscribe({
      next: (v) => this.select(v),
      error: () => void 0
    });
  }

  select(variant: VariantSearchResult): void {
    this.variantSelected.emit(variant);
    this.term = '';
    this.results = [];
  }
}
