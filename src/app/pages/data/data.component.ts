import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';
import { TraineeDetailsDialogComponent } from './trainee-details-dialog.component';

@Component({
  selector: 'app-data',
  standalone: true,
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ]
})
export class DataComponent implements OnInit, AfterViewInit {
  private readonly FILTER_STORAGE_KEY = 'traineeFilter';
  private readonly PAGINATOR_PAGE_KEY = 'traineePageIndex';
  private readonly PAGINATOR_SIZE_KEY = 'traineePageSize';

  displayedColumns: string[] = ['select', 'edit', 'id', 'name', 'date', 'grade', 'subject'];
  dataSource = new MatTableDataSource<Trainee>();
  selection = new SelectionModel<Trainee>(true, []);

  currentTempId: number | null = null;
  selectedTrainee: Trainee | null = null;
  showDetails = false;
  isNewTrainee = false;
  filterValue: string = '';
  currentTempRow: Trainee | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.dataService.trainees$.subscribe(trainees => {
      this.dataSource.data = trainees;
    });

    // Helper: parse a date safely. Accepts Date | "YYYY-MM-DD" | other strings.
    const parseDateSafe = (val: any): Date | null => {
      if (val == null) return null;
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
      }
      const s = String(val).trim();
      // If format is exactly YYYY-MM-DD, append T00:00:00 to avoid timezone shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // Integrated filter predicate with support for multiple filters, column-specific filters, and operators
    this.dataSource.filterPredicate = (data: Trainee, filter: string): boolean => {
      if (!filter) return true;

      // split by comma for integrated filters
      const filters = filter.split(',').map(f => f.trim()).filter(Boolean);

      return filters.every(f => {
        if (!f) return true;

        // Column-specific filter: e.g., date:>2024-01-01 or grade:<80 or name:yael
        const colMatch = f.match(/^(\w+):\s*([><=]?)(.+)$/);
        if (colMatch) {
          const col = colMatch[1];
          const operator = colMatch[2] || '=';
          const rawValue = colMatch[3].trim();

          const value = (data as any)[col];
          if (value === undefined) return false;

          // Numeric column: grade
          if (col === 'grade') {
            const num = parseFloat(rawValue);
            if (isNaN(num)) return true; // invalid numeric filter - ignore
            switch (operator) {
              case '>': return value > num;
              case '<': return value < num;
              case '=': return value === num;
              default: return true;
            }
          }

          // Date column
          if (col === 'date') {
            const parsedDate = parseDateSafe(rawValue);
            const traineeDate = parseDateSafe(value);
            if (!parsedDate || !traineeDate) return true; // can't interpret → don't exclude
            switch (operator) {
              case '>': return traineeDate > parsedDate;
              case '<': return traineeDate < parsedDate;
              case '=':
              default:
                // Compare only date part (yyyy-mm-dd)
                return traineeDate.toISOString().split('T')[0] === parsedDate.toISOString().split('T')[0];
            }
          }

          // Text columns (id, name, subject, ...)
          const left = String(value).toLowerCase();
          const right = rawValue.toLowerCase();
          return left.includes(right);
        }

        // Global operator without column: >, <, =
        const opMatch = f.match(/^([><=])\s*(.+)$/);
        if (opMatch) {
          const operator = opMatch[1];
          const rawValue = opMatch[2].trim();

          // Check for full or partial date format first
          if (/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(rawValue)) {
            const parsedDate = parseDateSafe(rawValue);
            const traineeDate = parseDateSafe(data.date);
            if (!parsedDate || !traineeDate) return false;

            switch (operator) {
              case '>': return traineeDate > parsedDate;
              case '<': return traineeDate < parsedDate;
              case '=':
              default:
                return traineeDate.toISOString().split('T')[0] === parsedDate.toISOString().split('T')[0];
            }
          }

          // Then check numeric (grade)
          const num = parseFloat(rawValue);
          if (!isNaN(num)) {
            switch (operator) {
              case '>': return data.grade > num;
              case '<': return data.grade < num;
              case '=': return data.grade === num;
            }
          }

          // If not numeric/date, treat as global text search fallback
        }

        // Default: global text search (case-insensitive)
        const term = f.toLowerCase();
        return Object.values(data).some(v => String(v).toLowerCase().includes(term));
      });
    };

    // Restore filter from localStorage (preserve case/format)
    const savedFilter = localStorage.getItem(this.FILTER_STORAGE_KEY);
    if (savedFilter) {
      this.filterValue = savedFilter;
      // apply exactly as saved (no forcing to lower-case)
      this.dataSource.filter = savedFilter.trim();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;

    const savedIndex = localStorage.getItem(this.PAGINATOR_PAGE_KEY);
    const savedSize = localStorage.getItem(this.PAGINATOR_SIZE_KEY);
    if (savedSize) this.paginator.pageSize = +savedSize;
    if (savedIndex) this.paginator.pageIndex = +savedIndex;

    this.dataSource._updateChangeSubscription();

    this.paginator.page.subscribe((event: PageEvent) => {
      localStorage.setItem(this.PAGINATOR_PAGE_KEY, event.pageIndex.toString());
      localStorage.setItem(this.PAGINATOR_SIZE_KEY, event.pageSize.toString());
    });

    this.cdr.detectChanges();
  }

  createEmptyTrainee(): Trainee {
    return { id: 0, name: '', date: '', grade: 0, subject: '' };
  }

  addTrainee(): void {
    const dialogRef = this.dialog.open(TraineeDetailsDialogComponent, {
      width: '400px',
      data: { trainee: this.createEmptyTrainee(), isNew: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataService.addTrainee(result);
        this.cdr.detectChanges();
      }
    });
  }

  selectTrainee(row: Trainee): void {
    const dialogRef = this.dialog.open(TraineeDetailsDialogComponent, {
      width: '400px',
      data: { trainee: { ...row }, isNew: false }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataService.updateTrainee(result);
        this.cdr.detectChanges();
      }
    });
  }

  removeSelectedTrainees(): void {
    if (!this.selection.hasValue()) return;

    const confirmDelete = window.confirm('Are you sure you want to delete the selected trainee(s)?');
    if (!confirmDelete) return;

    const toRemove = [...this.selection.selected];

    for (const t of toRemove) {
      // Remove the exact object reference by index (keep your service method for this)
      const index = this.dataSource.data.indexOf(t);
      if (index > -1) {
        // remove by id (service implementation in your project might accept index or id)
        this.dataService.removeTrainee(t.id);
      }

      // Clear selection if the row being edited is removed
      if (this.selectedTrainee === t) {
        this.selectedTrainee = null;
        this.showDetails = false;
      }
      if (this.currentTempRow === t) {
        this.currentTempRow = null;
        this.showDetails = false;
      }
    }

    this.selection.clear();
    this.cdr.detectChanges();
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach(row => this.selection.select(row));
  }

  todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  applyFilter(event: Event): void {
    // Keep the exact filter string (don't lowercase whole thing)
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.filterValue = filterValue;
    this.dataSource.filter = filterValue;

    // Save filter to localStorage (store exact format)
    localStorage.setItem(this.FILTER_STORAGE_KEY, filterValue);

    // Reset to first page when filter changes
    if (this.paginator) {
      this.paginator.firstPage();
      localStorage.setItem(this.PAGINATOR_PAGE_KEY, '0');
    }
  }
}
