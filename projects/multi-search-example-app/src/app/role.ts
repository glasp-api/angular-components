export class Role {
  character!: string;
  actor!: string;

  constructor(character: string, actor: string) {
    this.character = character;
    this.actor = actor;
  }
}
