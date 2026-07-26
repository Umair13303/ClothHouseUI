import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { CancelDialogComponent, CancelDialogData } from '../../shared/components/cancel-dialog/cancel-dialog.component';

@Injectable({ providedIn: 'root' })
export class CancelPromptService {
  constructor(private dialog: MatDialog) {}

  /** Resolves the typed reason, or null if the user backed out. */
  ask(data: CancelDialogData): Observable<string | null> {
    return this.dialog
      .open(CancelDialogComponent, { data, width: '420px' })
      .afterClosed()
      .pipe(map((result) => (typeof result === 'string' ? result : null)));
  }
}
