import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';

/**
 * One open GRN-originated cost layer the selected product can be returned
 * from (ADR-001 §5.4 / D17: a purchase return always names the shipment it
 * takes stock back out of, capped by that shipment's remaining quantity).
 */
interface ReturnableLayerDto {
  costLayerId: string;
  productVariantId: string;
  receiveNumber: string;
  documentDate: string;
  quantityRemaining: number;
  unitCostBase: number;
  vendorId: string;
  vendorName: string;
}

interface LayerRow extends ReturnableLayerDto {
  returnNow: number;
}

interface ReturnLine {
  costLayerId: string;
  productVariantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  receiveNumber: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  unitCostBase: number;
}

interface PurchaseReturnListDto {
  id: string;
  returnNumber: string;
  returnDate: string;
  vendorName: string;
  totalVendorCredit: number;
  items: { quantity: number }[];
}

@Component({
  selector: 'app-purchase-return',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    NativeDatePickerDirective,
    VariantPickerComponent
  ],
  templateUrl: './purchase-return.component.html',
  styleUrl: './purchase-return.component.scss'
})
export class PurchaseReturnComponent implements OnInit {
  returnDate = new Date().toISOString().slice(0, 10);
  remarks = '';

  selectedVariant = signal<VariantSearchResult | null>(null);
  loadingLayers = signal(false);
  layers: LayerRow[] = [];

  lines: ReturnLine[] = [];

  history = signal<PurchaseReturnListDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<PurchaseReturnListDto[]>(`${environment.apiUrl}/purchasereturns`).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  /** All lines must go back to one vendor — the first added line fixes it. */
  get vendorName(): string | null {
    return this.lines.length > 0 ? this.lines[0].vendorName : null;
  }

  onVariantSelected(v: VariantSearchResult): void {
    this.selectedVariant.set(v);
    this.layers = [];
    this.loadingLayers.set(true);
    this.http
      .get<ReturnableLayerDto[]>(`${environment.apiUrl}/purchasereturns/returnable-layers/${v.id}`)
      .subscribe({
        next: (layers) => {
          this.layers = layers.map((l) => ({ ...l, returnNow: 0 }));
          this.loadingLayers.set(false);
          if (layers.length === 0) {
            this.notify.error('No returnable shipments — this product has no remaining stock received from a vendor.');
          }
        },
        error: () => this.loadingLayers.set(false)
      });
  }

  /** Quantity of a layer already claimed by pending lines below. */
  pendingFor(layer: ReturnableLayerDto): number {
    return this.lines.filter((l) => l.costLayerId === layer.costLayerId).reduce((sum, l) => sum + l.quantity, 0);
  }

  addLayer(layer: LayerRow): void {
    const variant = this.selectedVariant();
    if (!variant) return;
    if (layer.returnNow <= 0) {
      this.notify.error('Enter a quantity to return from this shipment.');
      return;
    }
    if (layer.returnNow + this.pendingFor(layer) > layer.quantityRemaining) {
      this.notify.error(`Only ${layer.quantityRemaining - this.pendingFor(layer)} of shipment ${layer.receiveNumber} remains returnable.`);
      return;
    }
    if (this.lines.length > 0 && this.lines[0].vendorId !== layer.vendorId) {
      this.notify.error(
        `This shipment is from ${layer.vendorName}, but the return being built is for ${this.lines[0].vendorName}. Post separate returns per vendor.`
      );
      return;
    }

    this.lines.push({
      costLayerId: layer.costLayerId,
      productVariantId: layer.productVariantId,
      barcode: variant.barcode,
      productName: variant.productName,
      designNumber: variant.designNumber,
      receiveNumber: layer.receiveNumber,
      vendorId: layer.vendorId,
      vendorName: layer.vendorName,
      quantity: layer.returnNow,
      unitCostBase: layer.unitCostBase
    });
    layer.returnNow = 0;
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  get totalVendorCredit(): number {
    return this.lines.reduce((sum, l) => sum + l.quantity * l.unitCostBase, 0);
  }

  submit(): void {
    if (this.lines.length === 0) {
      this.notify.error('Add at least one line.');
      return;
    }

    this.saving.set(true);
    const payload = {
      returnNumber: null,
      returnDate: this.returnDate,
      vendorId: this.lines[0].vendorId,
      remarks: this.remarks || null,
      items: this.lines.map((l) => ({
        costLayerId: l.costLayerId,
        productVariantId: l.productVariantId,
        quantity: l.quantity
      }))
    };

    this.http.post<PurchaseReturnListDto>(`${environment.apiUrl}/purchasereturns`, payload).subscribe({
      next: (r) => {
        this.notify.success(`Purchase return ${r.returnNumber} posted; vendor debited.`);
        this.saving.set(false);
        this.lines = [];
        this.layers = [];
        this.selectedVariant.set(null);
        this.remarks = '';
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post the purchase return.');
        this.saving.set(false);
      }
    });
  }
}
