# MultiSearch

This library allows to show connected suggestions on multiple Angular Material Input Fields (levaraging from Angular's autocomplete library).

## Installation & Module Configuration

Run `npm -i @glasp/multi-search` to install the library. Please add the SearchModule as import in your app's module file.

```typescript
import {NgModule} from "@angular/core";
import {SearchModule} from "./search.module";

@NgModule({
  imports: [
    SearchModule
  ]
})
```

## Search Entity for input fields

Define an entity with the properties which connect the input fields, e.g. actors and which characters they have played.

```typescript
export class Role {
  character!: string;
  actor!: string;

  constructor(character: string, actor: string) {
    this.character = character;
    this.actor = actor;
  }
}
```

## IController Interface

In the Search Module, the SearchController is coordinating the suggestions of the input fields and processing the ingoing & outgoing module commmunication. Please implement a custom controller to communicate with the SearchController. 

```typescript
@Injectable()
export class RoleController implements IController<Role> {
  roles = [
    new Role("Hermione Granger", "Emma Watson"),
    ...
  ]

  provideSearchResults(params?: Role): Observable<Role[]> {
    return of(this._filter(params));
  }

  setCurrentValidation(status: boolean): void {
    console.log(status);
  }

  suggestionTrigger(input: Role): boolean {
    return input.character.length > 0 || input.actor.length > 0;
  }

  private _filter(value?: Role): Role[] {
    ...
  }
}
```

Three methods can be implemented:

1. `provideSearchResults(params?: Role): Observable<Role[]>` is providing the values the user has inserted into the input fields and should return an array of suggestions (here of Search Entity type `Role`)
2. `setCurrentValidation(status: boolean): void` provides a boolean value after each user input which indicates whether all user input fields are valid (meaning equalling one suggestion)
3. `suggestionTrigger(input: Role): boolean` defines when the suggestions should be shown and when `provideSearchResults(params?: Role): Observable<Role[]>` is calles

## Providing the IController Implementation

The IController Implementation needs to be provided with the InjectionToken `DATA_PROVIDER` in your app's module file.

```typescript
@NgModule({
  ...,
  providers: [{
    provide: DATA_PROVIDER,
    useClass: RoleController
  }]
})
```

## Displaying the Form Suggestions

Each MultiSearch component requires at least two Material form fields. And as below, each form field needs to have an input field and a search element below which holds the suggestions.

```html
<mat-form-field>
  <mat-label>Character</mat-label>
  <input aria-label="character"
         formControlName="characterInput"
         [search]="character">
  <search #character="search">
    <ng-template let-role>{{role.character}}</ng-template>
  </search>
</mat-form-field>
```

The following attributes for the `input` element are necessary for the MultiSearch component to work:

1. The `aria-label` is necessary for the mapping between the suggestions and the input field. The value should be the same wording as the corresponding property in the SearchEntity.
2. The `input` element needs to be a `FormControl`.
3. The `[search]` attribute requires the value of the template reference variable of the search element, here that's "character".

The value of the template reference variable of the `search` element always is `"search"`. For the individual suggestions, the property of the Search Entity can be referenced through an `ng-template`.

## Further information

That's it! For more information you can find the sample application at https://github.com/glasp-api/angular-components.
