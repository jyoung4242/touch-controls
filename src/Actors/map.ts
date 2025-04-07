import { Engine, Actor } from "excalibur";
import { Resources } from "../resources";

export class TestMap extends Actor {
  constructor() {
    super({
      x: 0,
      y: 0,
      width: 224,
      height: 208,
      z: 1,
    });
  }

  onInitialize(engine: Engine): void {
    this.graphics.use(Resources.map.toSprite());
    engine.currentScene.camera.strategy.lockToActor(this);
  }
}
