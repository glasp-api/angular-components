import { Component } from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'sample-multi-search';

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = fb.group({
      characterInput: [''],
      actorInput: ['']
    });
  }
}
