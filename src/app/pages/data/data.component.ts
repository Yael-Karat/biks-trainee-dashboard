import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
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

  displayedColumns: string[] = ['select', 'id', 'name', 'date', 'grade', 'subject'];
  dataSource = new MatTableDataSource<Trainee>();
  selection = new SelectionModel<Trainee>(true, []);

  nextTempId = -1;
  currentTempId: number | null = null;

  selectedTrainee: Trainee | null = null;
  editingTrainee: Trainee = this.createEmptyTrainee();
  showDetails = false;
  isNewTrainee = false;

  filterValue: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dataService: DataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.dataService.trainees$.subscribe(trainees => {
      this.dataSource.data = trainees;
    });

    this.dataSource.filterPredicate = (data: Trainee, filter: string) => {
      if (!filter) return true;
      filter = filter.trim().toLowerCase();

      if (filter.startsWith('id:')) {
        const idValue = filter.replace('id:', '').trim();
        return String(data.id).toLowerCase().includes(idValue);
      }

      if (filter.startsWith('>') || filter.startsWith('<')) {
        const operator = filter[0];
        const rawValue = filter.slice(1).trim();

        if (rawValue.includes('-')) {
          const parsedDate = new Date(rawValue);
          const traineeDate = new Date(data.date);

          if (!isNaN(parsedDate.getTime()) && !isNaN(traineeDate.getTime())) {
            return operator === '>'
              ? traineeDate > parsedDate
              : traineeDate < parsedDate;
          }
        }

        const numericValue = parseFloat(rawValue);
        if (!isNaN(numericValue)) {
          return operator === '>'
            ? data.grade > numericValue
            : data.grade < numericValue;
        }
        return true;
      }

      return Object.values(data).some(v =>
        String(v).toLowerCase().includes(filter)
      );
    };

    // Restore filter state from localStorage
    const savedFilter = localStorage.getItem(this.FILTER_STORAGE_KEY);
    if (savedFilter) {
      this.filterValue = savedFilter;
      this.dataSource.filter = savedFilter.trim().toLowerCase();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  createEmptyTrainee(): Trainee {
    return { id: 0, name: '', date: '', grade: 0, subject: '' };
  }

  addTrainee(): void {
    const newTrainee = this.createEmptyTrainee();
    newTrainee.id = this.nextTempId--;
    this.isNewTrainee = true;
    this.currentTempId = newTrainee.id;

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

    if (this.isNewTrainee && this.currentTempId != null) {
      this.dataService.replaceTrainee(this.currentTempId, this.editingTrainee);
      this.currentTempId = null;
    } else if (this.selectedTrainee) {
      this.dataService.updateTrainee(this.editingTrainee);
    }

    this.cancelEdit();
  }

  cancelEdit(): void {
    if (this.isNewTrainee && this.currentTempId != null) {
      this.dataService.removeTrainee(this.currentTempId);
      this.currentTempId = null;
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
    for (const t of toRemove) this.dataService.removeTrainee(t.id);

    const removedIds = new Set(toRemove.map(t => t.id));
    if (this.selectedTrainee && removedIds.has(this.selectedTrainee.id)) {
      this.selectedTrainee = null;
      this.showDetails = false;
    }

    if (this.currentTempId != null && removedIds.has(this.currentTempId)) {
      this.currentTempId = null;
      this.showDetails = false;
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

    // Save filter to localStorage
    localStorage.setItem(this.FILTER_STORAGE_KEY, filterValue);
  }
}
