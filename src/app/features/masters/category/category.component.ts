import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MenuService } from '../../../core/services/menu.service';
import { NotificationService } from '../../../core/services/notification.service';

interface CategoryDto {
  id: string;
  name: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  isActive: boolean;
}

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTableModule
  ],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss'
})
export class CategoryComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  categories = signal<CategoryDto[]>([]);
  loading = signal(false);
  showForm = false;
  editingId: string | null = null;

  formModel: { name: string; parentCategoryId: string | null; isActive: boolean } = {
    name: '',
    parentCategoryId: null,
    isActive: true
  };

  displayedColumns = ['name', 'parent', 'status', 'actions'];

  constructor(
    private http: HttpClient,
    private confirmDialog: ConfirmService,
    private notify: NotificationService,
    public menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<CategoryDto[]>(`${this.baseUrl}?includeInactive=true`).subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load categories.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = { name: '', parentCategoryId: null, isActive: true };
    this.showForm = true;
  }

  startEdit(c: CategoryDto): void {
    this.editingId = c.id;
    this.formModel = { name: c.name, parentCategoryId: c.parentCategoryId, isActive: c.isActive };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  save(): void {
    const payload = { ...this.formModel };
    const request$ = this.editingId
      ? this.http.put(`${this.baseUrl}/${this.editingId}`, payload)
      : this.http.post(this.baseUrl, payload);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.notify.success(this.editingId ? 'Category updated.' : 'Category created.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Save failed.')
    });
  }

  remove(c: CategoryDto): void {
    this.confirmDialog
      .ask({ title: 'Delete category?', message: `Delete category "${c.name}"?`, confirmLabel: 'Delete', danger: true })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${this.baseUrl}/${c.id}`).subscribe({
          next: () => {
            this.notify.success('Category deleted.');
            this.load();
          },
          error: () => this.notify.error('Delete failed.')
        });
      });
  }

  /** A category cannot be its own parent when editing. */
  availableParents(): CategoryDto[] {
    return this.categories().filter((c) => c.id !== this.editingId);
  }
}
