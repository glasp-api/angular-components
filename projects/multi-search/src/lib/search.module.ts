import {NgModule} from '@angular/core';
import { SearchComponent } from './search.component';
import { NgDirective } from './ng.directive';
import {MAT_SEARCH_SCROLL_STRATEGY_FACTORY_PROVIDER, SearchTriggerDirective} from './search-trigger.directive';
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CommonModule} from "@angular/common";
import {SearchController} from "./search-controller";

@NgModule({
  declarations: [
    SearchComponent,
    NgDirective,
    SearchTriggerDirective
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule
  ],
  providers: [SearchController, MAT_SEARCH_SCROLL_STRATEGY_FACTORY_PROVIDER],
  exports: [
    SearchComponent,
    SearchTriggerDirective
  ]
})
export class SearchModule { }
