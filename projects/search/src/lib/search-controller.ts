import {EventEmitter, Inject, Injectable, InjectionToken, OnDestroy} from "@angular/core";
import {Observable, ReplaySubject, Subject, Subscription} from "rxjs";

export const DATA_PROVIDER = new InjectionToken<IController<any>>('DATA_PROVIDER');

@Injectable()
export class SearchController<T> implements OnDestroy {
  setObjectEvent: EventEmitter<any> = new EventEmitter();
  openPanelEvent: EventEmitter<any> = new EventEmitter();
  hoverEnterEvent: EventEmitter<T> = new EventEmitter();
  hoverLeaveEvent: EventEmitter<T> = new EventEmitter();
  setSelectedEvent: EventEmitter<T> = new EventEmitter();

  searchedObjects$: Subject<T[]> = new ReplaySubject<T[]>(1);
  connectedElements: HTMLElement[] = [];

  searchSubscription: Subscription;
  controller: IController<T>;

  prevLength: number = 0;
  lengthOfOptions: number = 0;
  isValid: boolean = false;

  constructor(@Inject(DATA_PROVIDER) controller: IController<T>) {
    this.controller = controller;

    this.searchSubscription = this.searchedObjects$.subscribe(t => {
      this.lengthOfOptions = t.length;
      if (this.prevLength === 0){
        this.openPanelEvent.emit();
      }
      this.prevLength = this.lengthOfOptions;

      //validate search result
      if (this.hasValidInput(t)){
        this.controller.setCurrentValidation(this.isValid = true);
        this.setObjectEvent.emit(false);
      } else {
        this.controller.setCurrentValidation(this.isValid = false);
      }
    });
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  getObjects(): Observable<T[]> {
    return this.searchedObjects$;
  }

  setSelectedValue(selectedValue: T): void {
    var subscription = this.setSelectedEvent.subscribe(() => this.setObjectEvent.emit(true));
    this.setSelectedEvent.emit(selectedValue);
    this.controller.setCurrentValidation(this.isValid = true);
    subscription.unsubscribe();
  }

  requestSearchResults(): void {
    let inputs = this.getInputValues();
    if (this.controller.suggestionTrigger(inputs)){
      let tmp = this.controller.provideSearchResults(inputs);
      tmp.subscribe(t => {
        this.searchedObjects$.next(t);
      }, error => {
        this.reset();
        console.log("No valid search results.");
        //trigger no results found here
      });
    }
  }

  registerConnectedElements(connectedElement: HTMLElement){
    this.connectedElements?.push(connectedElement);
  }

  removeConnectedElement(connectedElement: HTMLElement){
    if (this.connectedElements != null){
      const index = this.connectedElements.indexOf(connectedElement, 0);
      if (index > -1) {
        this.connectedElements.splice(index, 1);
      }
    }
  }

  hasClickedAConnectedElement(clickTarget: HTMLElement): boolean{
    return this.connectedElements === null ? false : this.connectedElements?.includes(clickTarget);
  }

  openPanel(): void {
    if (this.controller.suggestionTrigger(this.getInputValues()) && this.lengthOfOptions > 0){
      this.openPanelEvent.emit();
    } else {
      this.setObjectEvent.emit(false);
    }
  }

  getInputValues(): any {
    let tmp: any = {};
    this.connectedElements.forEach(elm => {
      if (elm != null && elm instanceof HTMLInputElement){
        let attr = elm.getAttribute("aria-label");
        if (attr == null) return;
        let value = elm.value;
        let obj = {[attr]: value};
        Object.assign(tmp, obj);
      }
    })
    return tmp;
  }

  reset(): void {
    this.searchedObjects$ = new ReplaySubject<T[]>(1);
    this.lengthOfOptions = 0;
    this.prevLength = 0;
  }

  private hasValidInput(searches: T[]): any {
    var data = this.getInputValues();
    const keys = Object.keys(searches[0]).filter(value => Object.keys(data).includes(value));
    let checked = searches.filter(searchResult => {
      for(const key of keys){
        if(searchResult[key as keyof T] !== data[key]){
          return false;
        }
      }
      return true;
    });
    return checked.length > 0;
  }

  public isValidStatus(): boolean {
    return this.isValid;
  }

  mouseEnter(t: T){
    this.hoverEnterEvent.emit(t);
  }

  mouseLeave(t: T){
    this.hoverLeaveEvent.emit(t);
  }
}

export interface IController<T> {
  provideSearchResults(params?: any): Observable<T[]>;
  suggestionTrigger(inputs: any): boolean;
  setCurrentValidation(status: boolean): void;
}
