import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {ReactiveFormsModule} from "@angular/forms";
import {DATA_PROVIDER, SearchModule} from "@glasp/multi-search";
import {RoleController} from "./role.controller";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    SearchModule
  ],
  providers: [{
    provide: DATA_PROVIDER,
    useClass: RoleController
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
