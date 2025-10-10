import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SelectionModel } from '@angular/cdk/collections';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';
import { IsraeliIdValidatorDirective } from '../../validators/israeli-id.directive';

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
    IsraeliIdValidatorDirective
  ]
})
export class DataComponent implements OnInit, AfterViewInit {
  private readonly FILTER_STORAGE_KEY = 'traineeFilter';
  private readonly PAGINATOR_PAGE_KEY = 'traineePageIndex';
  private readonly PAGINATOR_SIZE_KEY = 'traineePageSize';

  displayedColumns: string[] = ['select', 'actions', 'id', 'name', 'date', 'grade', 'subject'];
  dataSource = new MatTableDataSource<Trainee>();
  selection = new SelectionModel<Trainee>(true, []);

  nextTempId = -1;

  selectedTrainee: Trainee | null = null;
  editingTrainee: Trainee = this.createEmptyTrainee();
  showDetails = false;
  isNewTrainee = false;

  filterValue: string = '';

  currentTempRow: Trainee | null = null; // <-- track the exact new row object

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dataService: DataService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.dataService.trainees$.subscribe(trainees => this.dataSource.data = trainees);

    // Filter predicate
    this.dataSource.filterPredicate = (data: Trainee, filter: string) => {
      if (!filter) return true;
      const filters = filter.split(',').map(f => f.trim().toLowerCase());
      return filters.every(f => Object.values(data).some(v => String(v).toLowerCase().includes(f)));
    };

    // Restore filter
    const savedFilter = localStorage.getItem(this.FILTER_STORAGE_KEY);
    if (savedFilter) {
      this.filterValue = savedFilter;
      this.dataSource.filter = savedFilter.trim().toLowerCase();
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
    const newTrainee = this.createEmptyTrainee();
    newTrainee.id = this.nextTempId--;

    this.isNewTrainee = true;
    this.currentTempRow = newTrainee;

    this.dataService.addTrainee({ ...newTrainee });
    this.editingTrainee = { ...newTrainee };
    this.showDetails = true;

    this.cdr.detectChanges();
  }

  selectTrainee(row: Trainee): void {
    this.isNewTrainee = false;
    this.selectedTrainee = row;
    this.editingTrainee = { ...row };
    this.showDetails = true;
  }

  saveTrainee(form: NgForm): void {
    if (!form.valid) return;
    this.editingTrainee.grade = Math.min(Math.max(this.editingTrainee.grade, 0), 100);

    if (this.isNewTrainee && this.currentTempRow) {
      this.dataService.replaceTrainee(this.currentTempRow.id, this.editingTrainee);
      this.currentTempRow = null;
    } else if (this.selectedTrainee) {
      this.dataService.updateTrainee(this.editingTrainee);
    }

    this.cancelEdit();
  }

  cancelEdit(): void {
    if (this.isNewTrainee && this.currentTempRow) {
      this.dataService.removeTrainee(this.currentTempRow.id);
      this.currentTempRow = null;
    }
    this.showDetails = false;
    this.isNewTrainee = false;
    this.selectedTrainee = null;
    this.editingTrainee = this.createEmptyTrainee();
  }

  removeSelectedTrainees(): void {
    if (!this.selection.hasValue()) return;

    const confirmDelete = window.confirm('Are you sure you want to delete the selected trainee(s)?');
    if (!confirmDelete) return;

    const toRemove = [...this.selection.selected];

    for (const t of toRemove) {
      // Remove the exact object reference
      const index = this.dataSource.data.indexOf(t);
      if (index > -1) {
        this.dataService.removeTraineeByIndex(index); // <-- new method in service
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
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filterValue = filterValue;
    this.dataSource.filter = filterValue;
    localStorage.setItem(this.FILTER_STORAGE_KEY, filterValue);

    if (this.paginator) {
      this.paginator.firstPage();
      localStorage.setItem(this.PAGINATOR_PAGE_KEY, '0');
    }
  }
}
