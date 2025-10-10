import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from '../../services/data.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { Trainee } from '../../models/trainee';

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
    MatPaginatorModule
  ],
  templateUrl: './monitor.component.html',
  styleUrls: ['./monitor.component.scss']
})
export class MonitorComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['id', 'name', 'avg', 'testsCount', 'status'];
  dataSource = new MatTableDataSource<TraineeAggregate>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Filters
  idsControl = new FormControl<number[] | null>(null);
  nameControl = new FormControl('');
  passedControl = new FormControl(true);
  failedControl = new FormControl(true);

  // Available id options
  availableIds: number[] = [];

  // raw data
  private trainees: Trainee[] = [];
  private subs: Subscription[] = [];

  PASS_THRESHOLD = 65;

  constructor(
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Load query params (persisted state)
    this.route.queryParamMap.subscribe((params) => {
      const ids = params.get('ids');
      const name = params.get('name') ?? '';
      const passed = params.get('passed');
      const failed = params.get('failed');

      if (ids) {
        try {
          const parsed = JSON.parse(ids);
          if (Array.isArray(parsed)) {
            this.idsControl.setValue(parsed.map(Number));
          } else {
            this.idsControl.setValue([Number(parsed)]);
          }
        } catch {
          this.idsControl.setValue(ids.split(',').map(Number).filter(Boolean));
        }
      } else {
        this.idsControl.setValue(null);
      }

      this.nameControl.setValue(name);
      this.passedControl.setValue(passed === null ? true : passed === 'true');
      this.failedControl.setValue(failed === null ? true : failed === 'true');
    });

    // Subscribe to DataService
    const s = this.dataService.trainees$.subscribe((data: Trainee[]) => {
      this.trainees = data ?? [];
      this.availableIds = Array.from(new Set(this.trainees.map(t => t.id))).sort((a, b) => a - b);
      this.applyFiltersAndBuildAggregates();
    });
    this.subs.push(s);

    // React to filter changes
    const nameSub = this.nameControl.valueChanges.pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => this.onFilterChange());
    const idsSub = this.idsControl.valueChanges.subscribe(() => this.onFilterChange());
    const passSub = this.passedControl.valueChanges.subscribe(() => this.onFilterChange());
    const failSub = this.failedControl.valueChanges.subscribe(() => this.onFilterChange());
    this.subs.push(nameSub, idsSub, passSub, failSub);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  onFilterChange(): void {
    // Persist state in query params
    const ids = this.idsControl.value;
    const name = (this.nameControl.value ?? '').trim();
    const passed = this.passedControl.value;
    const failed = this.failedControl.value;

    const q: any = {};
    if (ids && ids.length > 0) q.ids = JSON.stringify(ids);
    if (name) q.name = name;
    q.passed = String(passed);
    q.failed = String(failed);

    this.router.navigate([], { relativeTo: this.route, queryParams: q, replaceUrl: true });
    this.applyFiltersAndBuildAggregates();
  }

  private applyFiltersAndBuildAggregates(): void {
    // Aggregate by trainee id
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

    // Apply filters
    let filtered = aggregates;

    const selectedIds = this.idsControl.value;
    if (selectedIds && selectedIds.length > 0) {
      filtered = filtered.filter(a => selectedIds.includes(a.id));
    }

    const nameFilter = (this.nameControl.value ?? '').trim();
    if (nameFilter.length > 0) {
      const lower = nameFilter.toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(lower) || a.id.toString().includes(lower));
    }

    const showPassed = this.passedControl.value;
    const showFailed = this.failedControl.value;
    if (!(showPassed && showFailed)) {
      if (showPassed && !showFailed) filtered = filtered.filter(a => a.status === 'Passed');
      else if (!showPassed && showFailed) filtered = filtered.filter(a => a.status === 'Failed');
      else filtered = [];
    }

    filtered.sort((x, y) => y.avg - x.avg || x.name.localeCompare(y.name));
    this.dataSource.data = filtered;

    if (this.paginator) this.paginator.firstPage();
  }

  isPassed(avg: number): boolean {
    return avg >= this.PASS_THRESHOLD;
  }

  clearFilters(): void {
    this.idsControl.setValue(null);
    this.nameControl.setValue('');
    this.passedControl.setValue(true);
    this.failedControl.setValue(true);
    this.onFilterChange();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
