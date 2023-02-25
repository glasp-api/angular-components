import {
  AfterViewInit,
  Directive,
  ElementRef,
  Inject,
  InjectionToken,
  Input,
  NgZone, OnDestroy,
  Optional, ViewChild,
  ViewContainerRef
} from '@angular/core';
import {SearchComponent} from "./search.component";
import {SearchController} from "./search-controller";
import {ENTER, ESCAPE} from '@angular/cdk/keycodes';
import { WindowRef } from './window-ref';
import {Directionality} from '@angular/cdk/bidi';
import {TemplatePortal} from '@angular/cdk/portal';
import {
  ConnectedPosition,
  CdkConnectedOverlay,
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayRef,
  OverlayConfig,
  ScrollStrategy,
  PositionStrategy,
} from '@angular/cdk/overlay';
import {
  of as observableOf,
  filter,
  fromEvent,
  merge,
  Observable,
  Subscription,
  debounceTime,
  distinctUntilChanged, tap
} from "rxjs";
import {ViewportRuler} from '@angular/cdk/scrolling';
import {DOCUMENT} from "@angular/common";
import {NgControl} from "@angular/forms";

export type ModifierKey = 'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey';

/** Injection token that determines the scroll handling while the autocomplete panel is open. */
export const MAT_SEARCH_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>(
  'mat-autocomplete-scroll-strategy',
);

/** @docs-private */
export function MAT_SEARCH_SCROLL_STRATEGY_FACTORY(overlay: Overlay): () => ScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const MAT_SEARCH_SCROLL_STRATEGY_FACTORY_PROVIDER = {
  provide: MAT_SEARCH_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: MAT_SEARCH_SCROLL_STRATEGY_FACTORY,
};

@Directive()
export class _SearchTriggerBase<T> implements AfterViewInit, OnDestroy {
  private _overlay: Overlay;
  private _overlayRef: OverlayRef | null | undefined;
  private _portal: TemplatePortal | undefined;
  private _scrollStrategy: () => ScrollStrategy;
  private _previousValue: any;

  /** Strategy that is used to position the panel. */
  private _positionStrategy: FlexibleConnectedPositionStrategy | undefined;

  /** Subscription to viewport size changes. */
  private _viewportSubscription = Subscription.EMPTY;

  private inputSubscription!: Subscription;
  private objectSubscription: Subscription;
  private panelSubscription: Subscription;
  private heightAdjustmentSubscription: Subscription | null = null;

  /** The subscription for closing actions (some are bound to document). */
  private _closingActionsSubscription: Subscription | null = null;

  @Input('search') search!: SearchComponent<T>;
  @ViewChild(CdkConnectedOverlay) cdkConnectedOverlay: CdkConnectedOverlay | undefined;

  constructor(private _element: ElementRef<HTMLInputElement>,
              private control : NgControl,
              private _elRef: ElementRef,
              private controller: SearchController<T>,
              private overlay: Overlay,
              @Optional() private _dir: Directionality | null, private _viewContainerRef: ViewContainerRef,
              private _viewportRuler: ViewportRuler, private _zone: NgZone,
              @Inject(MAT_SEARCH_SCROLL_STRATEGY) scrollStrategy: any,
              @Optional() @Inject(DOCUMENT) private _document: any,
              private winRef: WindowRef) {
    this._overlay = overlay;
    this._scrollStrategy = scrollStrategy;

    this.objectSubscription = this.controller.setObjectEvent.subscribe((getValue) => {
      if (getValue) this.control.control?.setValue(this.search.getSelectedValue());
      this.closePanel();
    })
    this.panelSubscription = this.controller.openPanelEvent.subscribe(() => this._attachOverlay());
  }

  ngOnDestroy() {
    this.panelSubscription.unsubscribe();
    this.objectSubscription.unsubscribe();
    this._viewportSubscription.unsubscribe();
    this.inputSubscription.unsubscribe();
    if (this.heightAdjustmentSubscription !== null) this.heightAdjustmentSubscription.unsubscribe();
    this.controller.removeConnectedElement(this._element.nativeElement);
    this._destroyPanel();
  }

  ngAfterViewInit(): void {
    this.heightAdjustmentSubscription = this.search.heightAdjustmentEvent.subscribe((value) => {
      this._elRef.nativeElement.closest(".mat-form-field").style.marginBottom = value + "px";
      this._overlayRef?.updatePosition();
    });
    this.controller.registerConnectedElements(this._element.nativeElement);
    this.inputSubscription = this.initInputSubscription();
  }

  /** Destroys the autocomplete suggestion panel. */
  private _destroyPanel(): void {
    if (this._overlayRef) {
      this.closePanel();
      this._overlayRef.dispose();
      this._overlayRef = null;
    }
  }

  private initInputSubscription(): Subscription {
    return fromEvent(this._element.nativeElement, 'keyup')
      .pipe(
        filter(Boolean),
        debounceTime(150),
        distinctUntilChanged(),
        tap((text) => {
          this.controller.requestSearchResults();
          //here forward input value to request search
          this.controller.openPanel();
        })
      ).subscribe();
  }

  /** Whether or not the search panel is open. */
  get panelOpen(): boolean {
    return this._overlayAttached;
  }
  private _overlayAttached: boolean = false;

  private _getOverlayConfig(): OverlayConfig {
    return new OverlayConfig({
      positionStrategy: this._getOverlayPosition(),
      scrollStrategy: this._scrollStrategy(),
      width: this._getPanelWidth(),
      direction: this._dir ?? undefined
    });
  }

  private _getOverlayPosition(): PositionStrategy {
    const strategy = this._overlay
      .position()
      .flexibleConnectedTo(this._getConnectedElement())
      .withFlexibleDimensions(false)
      .withPush(false);

    _SearchTriggerBase._setStrategyPositions(strategy);
    this._positionStrategy = strategy;
    return strategy;
  }

  /**
   * A stream of actions that should close the autocomplete panel, including
   * when an option is selected, on blur, and when TAB is pressed.
   */
  get panelClosingActions(): Observable<any> {
    return merge(
      this._getOutsideClickStream(),
      this._overlayRef
        ? this._overlayRef.detachments().pipe(filter(() => this._overlayAttached))
        : observableOf(),
    );
  }

  /** Stream of clicks outside of the autocomplete panel. */
  private _getOutsideClickStream(): Observable<any> {
    return merge(
      fromEvent(this._document, 'click') as Observable<MouseEvent>,
      fromEvent(this._document, 'auxclick') as Observable<MouseEvent>,
      fromEvent(this._document, 'touchend') as Observable<TouchEvent>,
    ).pipe(
      filter(event => {
        // If we're in the Shadow DOM, the event target will be the shadow root, so we have to
        // fall back to check the first element in the path of the click event.
        let clickTarget!: HTMLElement;
        if (event.target instanceof HTMLElement){
          clickTarget = event.target;
        }

        const customOrigin = this._getConnectedElement();

        return (
          this._overlayAttached &&
          clickTarget !== this._element.nativeElement &&
          // Normally focus moves inside `mousedown` so this condition will almost always be
          // true. Its main purpose is to handle the case where the input is focused from an
          // outside click which propagates up to the `body` listener within the same sequence
          // and causes the panel to close immediately (see #3106).
          !this.controller.hasClickedAConnectedElement(this._document.activeElement) &&
          (!customOrigin || !this.controller.hasClickedAConnectedElement(clickTarget)) &&
          !!this._overlayRef &&
          !this._overlayRef.overlayElement.contains(clickTarget)
        );
      }),
    );
  }

  /** Sets the positions on a position strategy based on the directive's input state. */
  private static _setStrategyPositions(positionStrategy: FlexibleConnectedPositionStrategy) {
    // Note that we provide horizontal fallback positions, even though by default the dropdown
    // width matches the input, because consumers can override the width. See #18854.
    const belowPositions: ConnectedPosition[] = [
      {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top'},
      {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top'},
    ];

    let positions: ConnectedPosition[];
    positions = belowPositions;
    positionStrategy.withPositions(positions);
  }

  private _getConnectedElement(): HTMLElement {
    return this._elRef.nativeElement.closest(".mat-form-field-flex");
  }

  private _getPanelWidth(): number {
    return this._getConnectedElement()!.getBoundingClientRect().width;
  }

  private _getPaddingLeft(): number {
    return this.winRef.nativeWindow.getComputedStyle(this._elRef.nativeElement.closest(".mat-form-field-flex"), null).paddingLeft;
  }

  closePanel(): void {
    if (!this._overlayAttached){
      return;
    }

    if (this._overlayRef && this._overlayRef.hasAttached()) {
      this._closingActionsSubscription?.unsubscribe();
      this._resetMarginBottom();
      this._overlayRef.detach();
    }
  }

  private _resetMarginBottom(): void {
    this._elRef.nativeElement.closest(".mat-form-field").style.marginBottom = "0px";
  }

  private _hasActiveOption(): boolean {
    return this.search.currentWrapper !== null;
  }

  _handleKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    const hasModifier = hasModifierKey(event);

    // Prevent the default action on all escape key presses. This is here primarily to bring IE
    // in line with other browsers. By default, pressing escape on IE will cause it to revert
    // the input value to the one that it had on focus, however it won't dispatch any events
    // which means that the model value will be out of sync with the view.
    if (keyCode === ESCAPE && !hasModifier) {
      event.preventDefault();
    }

    if (this._hasActiveOption() && keyCode === ENTER && this.panelOpen && !hasModifier) {
      this.search.setCurrentActiveObject();
      this.search.resetActiveWrapper();
      event.preventDefault();
    }
  }

  _handleInput(event: KeyboardEvent): void {
    let target = event.target as HTMLInputElement;
    let value : number | string | null = target.value;

    if (this._previousValue !== value){
      this._previousValue = value;
      this.controller.requestSearchResults();
      //here forward input value to request search
      this.controller.openPanel();
    }
  }

  _handleFocus(): void {
    if (!this.controller.isValidStatus()){
      this.controller.openPanel();
    }
  }

  _handleClick(): void {
    if (!this.controller.isValidStatus()){
      this.controller.openPanel();
    }
  }

  _attachOverlay(): void {
    let overlayRef = this._overlayRef;

    if (!overlayRef){
      this._portal = new TemplatePortal(this.search.template, this._viewContainerRef);
      overlayRef = this._overlay.create(this._getOverlayConfig());
      this._overlayRef = overlayRef;
      this._viewportSubscription = this._viewportRuler.change().subscribe(() => {
        if (this.panelOpen && overlayRef) {
          overlayRef.updateSize({width: this._getPanelWidth()});
        }
      });
    } else {
      this._positionStrategy!.setOrigin(this._getConnectedElement());
      overlayRef.updateSize({width: this._getPanelWidth()});
      this.search.setWidth(this._getPanelWidth());
    }

    if (overlayRef && !overlayRef.hasAttached()) {
      overlayRef.attach(this._portal);
      this._closingActionsSubscription = this.panelClosingActions.subscribe(() => this.closePanel());
    }

    this.search.setWidth(this._getPanelWidth())
    this.search.setPaddingLeft(this._getPaddingLeft());

    this._overlayAttached = true;
  }
}

@Directive({
  selector: 'input[search]',
  host: {
    '(click)': '_handleClick()',
    '(keydown)': '_handleKeydown($event)',
    '(focusin)': '_handleFocus()'
  },
  exportAs: 'searchTrigger'
})
export class SearchTriggerDirective<T> extends _SearchTriggerBase<T> {
}

/**
 * Checks whether a modifier key is pressed.
 * @param event Event to be checked.
 */
export function hasModifierKey(event: KeyboardEvent, ...modifiers: ModifierKey[]): boolean {
  if (modifiers.length) {
    return modifiers.some(modifier => event[modifier]);
  }

  return event.altKey || event.shiftKey || event.ctrlKey || event.metaKey;
}
