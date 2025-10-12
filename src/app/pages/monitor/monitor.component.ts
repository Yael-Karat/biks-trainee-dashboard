import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';
import { StateService } from '../../services/state.service';

interface TraineeAggregate {
  id: number;
  name: string;
  avg: number;
  testsCount: number;
  status: 'Passed' | 'Failed';
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.scss']
})
export class MonitorComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['id', 'name', 'avg', 'testsCount', 'status'];
  dataSource = new MatTableDataSource<TraineeAggregate>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  idsControl = new FormControl<number[]>([]);
  nameControl = new FormControl('');
  passedControl = new FormControl(true);
  failedControl = new FormControl(true);

  availableIds: number[] = [];
  private trainees: Trainee[] = [];
  private subs: Subscription[] = [];
  private ignoreQuerySync = false; // to prevent self-triggered query reloads

  readonly PASS_THRESHOLD = 65;

  constructor(
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
  // Load saved state first
  const savedState = this.stateService.getMonitorState();
  this.idsControl.setValue(savedState.ids, { emitEvent: false });
  this.nameControl.setValue(savedState.name, { emitEvent: false });
  this.passedControl.setValue(savedState.passed, { emitEvent: false });
  this.failedControl.setValue(savedState.failed, { emitEvent: false });

  // Subscribe to data
  const dataSub = this.dataService.trainees$.subscribe(data => {
    this.trainees = data ?? [];
    this.availableIds = Array.from(new Set(this.trainees.map(t => t.id))).sort((a, b) => a - b);
    this.applyFiltersAndBuildAggregates();
  });
  this.subs.push(dataSub);

  // Watch filter changes
  const saveState = () => this.stateService.setMonitorState({
    ids: this.idsControl.value ?? [],
    name: this.nameControl.value ?? '',
    passed: this.passedControl.value ?? true,
    failed: this.failedControl.value ?? true
  });

  this.subs.push(
    this.idsControl.valueChanges.subscribe(() => { saveState(); this.onFilterChange(); }),
    this.nameControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(() => { saveState(); this.onFilterChange(); }),
    this.passedControl.valueChanges.subscribe(() => { saveState(); this.onFilterChange(); }),
    this.failedControl.valueChanges.subscribe(() => { saveState(); this.onFilterChange(); })
  );
}


  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  onFilterChange(): void {
    const ids = this.idsControl.value ?? [];
    const name = (this.nameControl.value ?? '').trim();
    const passed = this.passedControl.value;
    const failed = this.failedControl.value;

    const query: any = {};
    if (ids.length) query.ids = JSON.stringify(ids);
    if (name) query.name = name;
    query.passed = String(passed);
    query.failed = String(failed);

    this.ignoreQuerySync = true;
    this.router.navigate([], { relativeTo: this.route, queryParams: query, replaceUrl: true })
      .finally(() => (this.ignoreQuerySync = false));

    this.applyFiltersAndBuildAggregates();
  }

  private applyFiltersAndBuildAggregates(): void {
    const grouped = new Map<number, { name: string; total: number; count: number }>();
    for (const t of this.trainees) {
      if (!grouped.has(t.id)) grouped.set(t.id, { name: t.name, total: 0, count: 0 });
      const g = grouped.get(t.id)!;
      g.total += t.grade ?? 0;
      g.count += 1;
    }

    let aggregates: TraineeAggregate[] = [];
    grouped.forEach((v, id) => {
      const avg = v.count > 0 ? v.total / v.count : 0;
      aggregates.push({
        id,
        name: v.name,
        avg: Math.round((avg + Number.EPSILON) * 100) / 100,
        testsCount: v.count,
        status: avg >= this.PASS_THRESHOLD ? 'Passed' : 'Failed'
      });
    });

    const ids = this.idsControl.value ?? [];
    const nameFilter = (this.nameControl.value ?? '').trim().toLowerCase();
    const showPassed = this.passedControl.value;
    const showFailed = this.failedControl.value;

    // Apply filters safely
    if (ids.length > 0) {
      aggregates = aggregates.filter(a => ids.includes(a.id));
    }
    if (nameFilter) {
      aggregates = aggregates.filter(a =>
        a.name.toLowerCase().includes(nameFilter) || a.id.toString().includes(nameFilter)
      );
    }
    aggregates = aggregates.filter(a =>
      (showPassed && a.status === 'Passed') || (showFailed && a.status === 'Failed')
    );

    // Sort & update
    aggregates.sort((x, y) => y.avg - x.avg || x.name.localeCompare(y.name));
    this.dataSource.data = aggregates;
    if (this.paginator) this.paginator.firstPage();
  }

  clearFilters(): void {
    this.idsControl.setValue([]);
    this.nameControl.setValue('');
    this.passedControl.setValue(true);
    this.failedControl.setValue(true);
    this.onFilterChange();
  }

clearIds(): void {
  this.idsControl.setValue([]);
  this.onFilterChange();
}

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
