import {AfterContentInit, AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output} from '@angular/core';

@Directive({
  selector: '[ngInit]'
})
export class NgDirective implements OnDestroy, AfterContentInit {
  @Output('ngInit') initEvent: EventEmitter<ElementRef> = new EventEmitter();
  @Output('ngDestroy') destroyEvent: EventEmitter<ElementRef> = new EventEmitter();

  constructor(private elementRef: ElementRef) {
  }

  ngAfterContentInit(): void {
    this.initEvent.emit(this.elementRef);
  }

  ngOnDestroy(): void {
    this.destroyEvent.emit(this.elementRef);
  }
}

