import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';

interface OpeningStockLine {
  variantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  quantity: number;
  unitCost: number;
}

interface OpeningStockListDto {
  id: string;
  referenceNumber: string;
  openingDate: string;
  remarks: string | null;
  items: { quantity: number; unitCost: number }[];
}

@Component({
  selector: 'app-opening-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, VariantPickerComponent, NativeDatePickerDirective],
  templateUrl: './opening-stock.component.html',
  styleUrl: './opening-stock.component.scss'
})
export class OpeningStockComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/openingstock`;

  openingDate = new Date().toISOString().slice(0, 10);
  remarks = '';
  lines: OpeningStockLine[] = [];

  history = signal<OpeningStockListDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  constructor(private http: HttpClient, private notify: NotificationService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<OpeningStockListDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  addVariant(v: VariantSearchResult): void {
    const existing = this.lines.find((l) => l.variantId === v.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.lines.push({
      variantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      quantity: 1,
      unitCost: v.lastPurchasePrice || 0
    });
  }

  removeLine(i: number): void {
    this.lines.splice(i, 1);
  }

  get totalValue(): number {
    return this.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  }

  submit(): void {
    if (this.lines.length === 0) {
      this.notify.error('Add at least one item.');
      return;
    }

    // ADR-001 §5.2: zero-cost lines create estimated-cost stock layers and
    // show 100% margin until corrected — make the operator confirm on purpose.
    const zeroCostCount = this.lines.filter((l) => !l.unitCost || l.unitCost === 0).length;
    if (zeroCostCount > 0) {
      this.confirm
        .ask({
          title: 'Lines with zero cost',
          message:
            `${zeroCostCount} line(s) have a unit cost of 0. Their stock value will be recorded as ` +
            'an estimate of Rs 0 and profit reports will overstate margin until the cost is corrected. Post anyway?',
          confirmLabel: 'Post anyway',
          icon: 'warning'
        })
        .subscribe((ok) => {
          if (ok) this.postOpeningStock();
        });
      return;
    }

    this.postOpeningStock();
  }

  private postOpeningStock(): void {
    this.saving.set(true);
    const payload = {
      referenceNumber: null,
      openingDate: this.openingDate,
      remarks: this.remarks || null,
      items: this.lines.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity, unitCost: l.unitCost }))
    };

    this.http.post(this.baseUrl, payload).subscribe({
      next: () => {
        this.notify.success('Opening stock posted successfully.');
        this.lines = [];
        this.remarks = '';
        this.saving.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post opening stock.');
        this.saving.set(false);
      }
    });
  }

  lineTotal(items: { quantity: number; unitCost: number }[]): number {
    return items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  }
}
