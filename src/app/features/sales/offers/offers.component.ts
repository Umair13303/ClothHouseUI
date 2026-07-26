import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';
import { NotificationService } from '../../../core/services/notification.service';

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
export type OfferScopeValue = 'All' | 'Brand' | 'Category' | 'Product';

export interface SaleOfferDto {
  id: string;
  name: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  scope: OfferScopeValue;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  productId: string | null;
  productName: string | null;
  isActive: boolean;
  isCurrentlyRunning: boolean;
}

interface NamedItem {
  id: string;
  name: string;
}

const SCOPES: { value: OfferScopeValue; label: string }[] = [
  { value: 'All', label: 'Whole store' },
  { value: 'Brand', label: 'One brand' },
  { value: 'Category', label: 'One category' },
  { value: 'Product', label: 'One product' }
];

/**
 * Manage time-boxed "sale offer" discounts. While an offer is running the
 * POS applies its percentage automatically as a line discount on every
 * matching product (see PosComponent.applyBestOffer).
 */
@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    NativeDatePickerDirective
  ],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss'
})
export class OffersComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/saleoffers`;

  offers = signal<SaleOfferDto[]>([]);
  brands = signal<NamedItem[]>([]);
  categories = signal<NamedItem[]>([]);
  products = signal<NamedItem[]>([]);
  loading = signal(false);
  saving = signal(false);

  scopes = SCOPES;

  editingId: string | null = null;
  name = '';
  discountPercent: number | null = null;
  startDate = new Date().toISOString().slice(0, 10);
  endDate = new Date().toISOString().slice(0, 10);
  scope: OfferScopeValue = 'All';
  brandId: string | null = null;
  categoryId: string | null = null;
  productId: string | null = null;
  isActive = true;

  constructor(private http: HttpClient, private notify: NotificationService, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.http.get<NamedItem[]>(`${environment.apiUrl}/brands`).subscribe((b) => this.brands.set(b));
    this.http.get<NamedItem[]>(`${environment.apiUrl}/categories`).subscribe((c) => this.categories.set(c));
    this.http.get<NamedItem[]>(`${environment.apiUrl}/products`).subscribe((p) => this.products.set(p));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<SaleOfferDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.offers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  scopeTarget(o: SaleOfferDto): string {
    switch (o.scope) {
      case 'Brand': return o.brandName ?? '—';
      case 'Category': return o.categoryName ?? '—';
      case 'Product': return o.productName ?? '—';
      default: return 'Whole store';
    }
  }

  edit(o: SaleOfferDto): void {
    this.editingId = o.id;
    this.name = o.name;
    this.discountPercent = o.discountPercent;
    this.startDate = o.startDate.slice(0, 10);
    this.endDate = o.endDate.slice(0, 10);
    this.scope = o.scope;
    this.brandId = o.brandId;
    this.categoryId = o.categoryId;
    this.productId = o.productId;
    this.isActive = o.isActive;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  submit(): void {
    if (!this.name.trim() || !this.discountPercent || this.discountPercent <= 0 || this.discountPercent > 100) {
      this.notify.error('Enter an offer name and a discount percent between 0 and 100.');
      return;
    }

    this.saving.set(true);
    const payload = {
      name: this.name.trim(),
      discountPercent: this.discountPercent,
      startDate: this.startDate,
      endDate: this.endDate,
      scope: this.scope,
      brandId: this.scope === 'Brand' ? this.brandId : null,
      categoryId: this.scope === 'Category' ? this.categoryId : null,
      productId: this.scope === 'Product' ? this.productId : null,
      isActive: this.isActive
    };

    const request = this.editingId
      ? this.http.put(`${this.baseUrl}/${this.editingId}`, payload)
      : this.http.post(this.baseUrl, payload);

    request.subscribe({
      next: () => {
        this.notify.success(this.editingId ? 'Offer updated.' : 'Offer created.');
        this.resetForm();
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to save the offer.');
        this.saving.set(false);
      }
    });
  }

  remove(o: SaleOfferDto): void {
    this.confirm
      .ask({ title: 'Delete Offer', message: `Delete offer "${o.name}"?`, confirmLabel: 'Delete', danger: true })
      .subscribe((ok) => {
        if (!ok) return;
        this.http.delete(`${this.baseUrl}/${o.id}`).subscribe({
          next: () => {
            this.notify.success('Offer deleted.');
            if (this.editingId === o.id) this.resetForm();
            this.load();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Failed to delete the offer.')
        });
      });
  }

  private resetForm(): void {
    this.editingId = null;
    this.name = '';
    this.discountPercent = null;
    this.startDate = new Date().toISOString().slice(0, 10);
    this.endDate = new Date().toISOString().slice(0, 10);
    this.scope = 'All';
    this.brandId = null;
    this.categoryId = null;
    this.productId = null;
    this.isActive = true;
  }
}
