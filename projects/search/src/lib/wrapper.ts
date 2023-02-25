export class Wrapper<T, V> {
  private value: V;
  private t: T;

  constructor(t: T, value: V) {
    this.value = value;
    this.t = t;
  }

  public getObject(): T {
    return this.t;
  }

  public getValue(): V {
    return this.value;
  }
}

export class EntityWrapper<T, V> extends Wrapper<T, V> {
  constructor(t: T, v: V) {
    super(t, v);
  }
}
