import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface DataState {
  filterValue: string;
  pageIndex: number;
  pageSize: number;
}

interface MonitorState {
  ids: number[];
  name: string;
  passed: boolean;
  failed: boolean;
}

interface AppState {
  data: DataState;
  monitor: MonitorState;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private STORAGE_KEY = 'appState';

  private defaultState: AppState = {
    data: { filterValue: '', pageIndex: 0, pageSize: 10 },
    monitor: { ids: [], name: '', passed: true, failed: true }
  };

  private state: AppState;
  private stateSubject = new BehaviorSubject<AppState>(this.defaultState);

  state$ = this.stateSubject.asObservable();

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.state = { ...this.defaultState, ...JSON.parse(saved) };
      } catch {
        this.state = this.defaultState;
      }
    } else {
      this.state = this.defaultState;
    }
    this.stateSubject.next(this.state);
  }
  
  /** ===================== DATA ===================== */
  getDataState(): DataState {
    return this.state.data;
  }

  setDataState(partial: Partial<DataState>): void {
    this.state.data = { ...this.state.data, ...partial };
    this.save();
  }

  /** ===================== MONITOR ===================== */
  getMonitorState(): MonitorState {
    return this.state.monitor;
  }

  setMonitorState(partial: Partial<MonitorState>): void {
    this.state.monitor = { ...this.state.monitor, ...partial };
    this.save();
  }

  /** ===================== SAVE/LOAD ===================== */
  private save(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    this.stateSubject.next(this.state);
  }
}
