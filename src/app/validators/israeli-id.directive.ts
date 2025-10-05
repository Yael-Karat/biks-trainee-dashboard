import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[appIsraeliId]',
  standalone: true,
  providers: [
    { provide: NG_VALIDATORS, useExisting: IsraeliIdValidatorDirective, multi: true }
  ]
})
export class IsraeliIdValidatorDirective implements Validator {

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const id = String(value).trim();
    if (id.length > 9 || isNaN(+id)) {
      return { israeliId: true };
    }

    const padded = id.padStart(9, '0');
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      let num = Number(padded[i]) * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }

    return sum % 10 === 0 ? null : { israeliId: true };
  }
}
