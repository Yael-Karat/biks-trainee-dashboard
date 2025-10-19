import { Pipe, PipeTransform } from '@angular/core';
import { Trainee } from '../models/trainee';

@Pipe({
  name: 'uniqueById',
  standalone: true
})
export class UniqueByIdPipe implements PipeTransform {
  transform(value: Trainee[]): Trainee[] {
    if (!value) return [];
    const map = new Map<number, Trainee>();
    value.forEach(t => map.set(t.id, t)); // keep last occurrence
    return Array.from(map.values());
  }
}
