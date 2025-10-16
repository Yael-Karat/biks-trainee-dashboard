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
import { StateService } from '../../services/state.service';
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
    private dialog: MatDialog,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
    this.dataService.trainees$.subscribe(trainees => {
      this.dataSource.data = trainees;
    });

    // Helper: safely parse a date (supports string, Date, or ISO)
    const parseDateSafe = (val: any): Date | null => {
      if (val == null) return null;
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
      }
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // --- Filter Predicate: keep all your advanced tests ---
    this.dataSource.filterPredicate = (data: Trainee, filter: string): boolean => {
      if (!filter) return true;

      const filters = filter.split(',').map(f => f.trim()).filter(Boolean);

      return filters.every(f => {
        if (!f) return true;

        // Column-specific filter: e.g. grade:>80, date:<2024-01-01, name:yael
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
            if (isNaN(num)) return true;
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
            if (!parsedDate || !traineeDate) return true;
            switch (operator) {
              case '>': return traineeDate > parsedDate;
              case '<': return traineeDate < parsedDate;
              case '=':
              default:
                return traineeDate.toISOString().split('T')[0] === parsedDate.toISOString().split('T')[0];
            }
          }

          // Text columns (id, name, subject, etc.)
          const left = String(value).toLowerCase();
          const right = rawValue.toLowerCase();
          return left.includes(right);
        }

        // Global operator-only filter (e.g. >80 or <2024-01-01)
        const opMatch = f.match(/^([><=])\s*(.+)$/);
        if (opMatch) {
          const operator = opMatch[1];
          const rawValue = opMatch[2].trim();

          // Try date format
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

          // Try numeric (grade)
          const num = parseFloat(rawValue);
          if (!isNaN(num)) {
            switch (operator) {
              case '>': return data.grade > num;
              case '<': return data.grade < num;
              case '=': return data.grade === num;
            }
          }
        }

        // Default global text search
        const term = f.toLowerCase();
        return Object.values(data).some(v => String(v).toLowerCase().includes(term));
      });
    };

    // --- Restore state from StateService ---
    const saved = this.stateService.getDataState();
    this.filterValue = saved.filterValue || '';
    this.dataSource.filter = this.filterValue.trim();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;

    // Restore pagination from shared state
    const saved = this.stateService.getDataState();
    if (saved.pageSize) this.paginator.pageSize = saved.pageSize;
    if (saved.pageIndex) this.paginator.pageIndex = saved.pageIndex;

    this.dataSource._updateChangeSubscription();

    // Save paginator changes
    this.paginator.page.subscribe((event: PageEvent) => {
      this.stateService.setDataState({
        pageIndex: event.pageIndex,
        pageSize: event.pageSize
      });
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
      const index = this.dataSource.data.indexOf(t);
      if (index > -1) {
        this.dataService.removeTrainee(t.id);
      }
      if (this.selectedTrainee === t || this.currentTempRow === t) {
        this.selectedTrainee = null;
        this.showDetails = false;
        this.currentTempRow = null;
      }
    }

    this.selection.clear();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.filterValue = '';
    this.dataSource.filter = '';
    this.stateService.setDataState({ filterValue: '' });

    // Reset paginator to first page after clearing
    if (this.paginator) {
      this.paginator.firstPage();
      this.stateService.setDataState({ pageIndex: 0 });
    }
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
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.filterValue = filterValue;
    this.dataSource.filter = filterValue;

    this.stateService.setDataState({ filterValue });

    if (this.paginator) {
      this.paginator.firstPage();
      this.stateService.setDataState({ pageIndex: 0 });
    }
  }
}
