import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisComponent } from './analysis.component';
import { DataService } from '../../services/data.service';
import { of } from 'rxjs';

describe('AnalysisComponent', () => {
  let component: AnalysisComponent;
  let fixture: ComponentFixture<AnalysisComponent>;
  let mockDataService: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    mockDataService = jasmine.createSpyObj('DataService', ['trainees$'], { trainees$: of([]) });

    await TestBed.configureTestingModule({
      imports: [AnalysisComponent],
      providers: [{ provide: DataService, useValue: mockDataService }]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update charts without errors', () => {
    component.updateCharts();
    expect(component.charts.length).toBeGreaterThan(0);
  });
});
