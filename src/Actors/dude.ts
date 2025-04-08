import { Actor, Engine, vec, Color, ScreenAppender, ScreenAppenderOptions } from "excalibur";
import { Resources } from "../resources";
import { TouchControlComponent } from "../Components/TouchControlComponent";

export class Dude extends Actor {
  tc: TouchControlComponent;
  engine: Engine | undefined;

  constructor(x: number, y: number) {
    super({
      pos: vec(x, y),
      width: 16,
      height: 16,
      z: 2,
    });
    this.tc = new TouchControlComponent();
    this.addComponent(this.tc);
  }
  onInitialize(engine: Engine): void {
    this.engine = engine;
    this.graphics.use(Resources.dude.toSprite());
    engine.currentScene.camera.strategy.lockToActor(this);
    engine.currentScene.camera.zoom = 2.0;
    this.tc.init();

    let sAOptions: ScreenAppenderOptions = {
      engine: engine,
      width: engine.screen.width * 2,
      height: engine.drawHeight,
      xPos: 10,
      color: Color.White,
      zIndex: 10,
    };
    let sAppender = new ScreenAppender(sAOptions);

    this.tc.onGesture("hold", data => {
      sAppender.log(1, [`Hold Gesture: ${data.duration}ms`]);
    });

    this.tc.onGesture("tap", data => {
      sAppender.log(1, [`Tap Gesture: ${data.duration}ms`]);
    });

    /* this.tc.onGesture("swipe", data => {
      sAppender.log(1, [`Swipe Gesture: ${data.distance}ms, ${data.direction?.x}, ${data.direction?.y}`]);
    }); */

    this.tc.onGesture("joystick", data => {
      sAppender.log(1, [`Joystick Gesture: ${data.distance}ms, ${data.direction?.x}, ${data.direction?.y}`]);
    });
  }
  onPreUpdate(engine: Engine, elapsed: number): void {}
}
