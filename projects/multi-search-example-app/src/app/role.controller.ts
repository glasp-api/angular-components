import {Injectable} from "@angular/core";
import {IController} from "@glasp/multi-search";
import {Role} from "./role";
import {Observable, of} from "rxjs";

@Injectable()
export class RoleController implements IController<Role> {
  roles = [
    new Role("Hermione Granger", "Emma Watson"),
    new Role("Harry Potter", "Daniel Radcliffe"),
    new Role("Hagrid", "Robbie Coltrane"),
    new Role("Ron Weasley", "Rupert Grint")
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
    const filterCharacter = value!.character.toLowerCase();
    const filterActor = value!.actor.toLowerCase();
    return this.roles.filter(role => role.character.toLowerCase().includes(filterCharacter)
      && role.actor.toLowerCase().includes(filterActor));
  }
}
