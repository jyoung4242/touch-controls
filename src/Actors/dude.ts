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
    this.tc.init({
      // Make swipe and joystick mutually exclusive
      exclusiveJoystickSwipe: true,
      exclusiveTapDoubleTap: false,
      // Configure swipe detection parameters
      minSwipeVelocity: 0.6, // Faster movement required for swipe
      minSwipeDuration: 30, // Minimum 50ms duration
      maxSwipeDuration: 800, // Maximum 800ms duration
      // Configure double tap detection
      doubleTapTime: 300, // 300ms window for double tap
      doubleTapDistance: 10, // Allow 10px movement between taps
      // Set joystick threshold
      swipeJoystickCutoff: 150, // Minimum 150px movement for joystick
    });

    let sAOptions: ScreenAppenderOptions = {
      engine: engine,
      width: engine.screen.width * 2,
      height: engine.drawHeight,
      xPos: 10,
      color: Color.Black,
      zIndex: 10,
    };
    let sAppender = new ScreenAppender(sAOptions);

    this.tc.onGesture("tap", data => {
      console.log("tap gesture detected", data);
      sAppender.log(1, [`Tap Gesture, pos: ${data.coords?.screenPos.x.toFixed(2)}, ${data.coords?.screenPos.y.toFixed(2)}`]);
    });

    this.tc.onGesture("doubletap", data => {
      console.log("doubletap gesture detected", data);
      sAppender.log(1, [`Double Tap Gesture, pos: ${data.coords?.screenPos.x.toFixed(2)}, ${data.coords?.screenPos.y.toFixed(2)}`]);
    });

    this.tc.onGesture("hold", data => {
      console.log("hold gesture detected", data);
      sAppender.log(1, [
        `Hold Gesture  for ${data.duration.toFixed(2)}ms at ${data.coords?.screenPos.x.toFixed(2)}, ${data.coords?.screenPos.y.toFixed(
          2
        )}`,
      ]);
    });

    // Register callbacks
    this.tc.onGesture("swipe", data => {
      console.log("Swipe detected!", data.direction, data.velocity);
      sAppender.log(1, [
        `Swipe Gesture for ${data.direction?.x.toFixed(2)}, ${data.direction?.y.toFixed(2)} and velocity ${data.velocity?.toFixed(2)}`,
      ]);
    });

    this.tc.onGesture("joystick", data => {
      console.log("joystick gesture detected", data);
      sAppender.log(1, [`Joystick Gesture , dir: ${data.direction?.x.toFixed(2)}, ${data.direction?.y.toFixed(2)}`]);
    });
  }

  onPreUpdate(engine: Engine, elapsed: number): void {
    this.tc.update(engine, elapsed);
  }
}
