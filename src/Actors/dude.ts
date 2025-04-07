import { Actor, Engine, vec } from "excalibur";
import { Resources } from "../resources";

export class Dude extends Actor {
  constructor(x: number, y: number) {
    super({
      pos: vec(x, y),
      width: 16,
      height: 16,
      z: 2,
    });
  }
  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.dude.toSprite());
    engine.currentScene.camera.strategy.lockToActor(this);
    engine.currentScene.camera.zoom = 2.0;
  }
}
