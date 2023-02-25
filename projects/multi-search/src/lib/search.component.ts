import {
  Attribute,
  ChangeDetectorRef,
  Component, ContentChild, EventEmitter, OnDestroy,
  TemplateRef, ViewChild
} from '@angular/core';
import {SearchController} from "./search-controller";
import {EntityWrapper, Wrapper} from "./wrapper";
import {Observable, Subscription} from "rxjs";
import {ResizedEvent} from 'angular-resize-event';

@Component({
  selector: 'search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  exportAs: 'search'
})
export class SearchComponent<T> implements OnDestroy {
  heightAdjustmentEvent: EventEmitter<Number> = new EventEmitter<Number>();

  @ContentChild(TemplateRef) addressTemplate!: TemplateRef<any>;
  // The @ViewChild query for TemplateRef here needs to be static because some code paths
  // lead to the overlay being created before change detection has finished for this component.
  // Notably, another component may trigger `focus` on the angular-components-trigger.

  /** @docs-private */
  @ViewChild(TemplateRef, {static: true}) template!: TemplateRef<any>;

  @Attribute("optionsWidth") optionsWidth: number | undefined;
  @Attribute("optionPaddingLeft") optionPaddingLeft: number | undefined;

  wrappers: EntityWrapper<T, string>[] = [];
  mouseSubscriptions: Wrapper<Subscription, T>[] = [];
  selectedSubscription: Subscription;
  searchSubscriber: Subscription | null = null;

  currentWrapper: EntityWrapper<T, string> | null = null;

  selectedValue: string = "";

  constructor(private readonly cdr: ChangeDetectorRef, private controller: SearchController<T>) {
    this.selectedSubscription = this.controller.setSelectedEvent.subscribe((object: T) => {
      let wrapper: EntityWrapper<T, string> = this.wrappers.filter((value, index, array) => this.compareEntity(value.getObject(), object))[0];
      this.selectedValue = wrapper.getValue();
    })
  }

  ngOnDestroy() {
    this.selectedSubscription.unsubscribe();
    this.searchSubscriber?.unsubscribe();
  }

  onResized(event: ResizedEvent) {
    this.recalcHeight(event.newRect.height);
  }

  resetActiveWrapper(): void {
    this.currentWrapper = null;
  }

  setCurrentActiveObject(): void {
    this.setObject(this.currentWrapper!.getObject());
  }

  getSelectedValue(): string {
    return this.selectedValue;
  }

  setObject(t: T): void {
    this.controller.setSelectedValue(t);
  }

  getObjects(): Observable<T[]> {
    return this.controller.getObjects();
  }

  setWidth(width: number): void {
    this.optionsWidth = width;
  }

  setPaddingLeft(paddingLeft: number): void {
    this.optionPaddingLeft = paddingLeft;
  }

  mouseEnter(t: T): void {
    this.controller.mouseEnter(t);
  }

  mouseLeave(t: T): void {
    this.controller.mouseLeave(t);
  }

  private recalcHeight(offset: number): void {
    var calcOffset = offset > 10 ? offset - 10 : offset;
    this.heightAdjustmentEvent.emit(calcOffset);
  }

  //After loading the options save the values for the current angular-components component
  setOptionValue(t: T, event: any) {
    let value = event.nativeElement.childNodes[0].nodeValue;
    let wrapper = new Wrapper(t, value);
    this.wrappers.push(wrapper);

    //subscribe to hover Events
    let mouseEnter = this.controller.hoverEnterEvent.subscribe((t1) => {
      if (this.compareEntity(t, t1)){
        event.nativeElement.style.backgroundColor = "#F6F6F6";
        this.currentWrapper = wrapper;
      }
    });
    let mouseLeave = this.controller.hoverLeaveEvent.subscribe((t1) => {
      if (this.compareEntity(t, t1)){
        event.nativeElement.style.backgroundColor = "#FFFFFF";
        this.currentWrapper = null;
      }
    });

    this.mouseSubscriptions.push(new Wrapper<Subscription, T>(mouseEnter, t), new Wrapper<Subscription, T>(mouseLeave, t));
  }

  removeOptionValue(t: T, event: any){
    let wrapper: EntityWrapper<T, string> = this.wrappers.filter((value, index, array) => this.compareEntity(value.getObject(), t))[0];
    const index = this.wrappers.indexOf(wrapper, 0);
    if (index > -1) {
      this.wrappers.splice(index, 1);
    }

    if (this.currentWrapper !== null && this.compareEntity(this.currentWrapper.getObject(), t)) this.currentWrapper = null;

    let subscriptionWrappers: Wrapper<Subscription, T>[] = this.mouseSubscriptions.filter((value, index, array) => this.compareEntity(value.getValue(), t));
    subscriptionWrappers.forEach(sub => {
      sub.getObject().unsubscribe();
      const index = this.mouseSubscriptions.indexOf(sub, 0);
      if (index > -1) {
        this.mouseSubscriptions.splice(index, 1);
      }
    });
  }

  private compareEntity(t1: T, t2: T): boolean {
    return JSON.stringify(t1) === JSON.stringify(t2);
  }
}
