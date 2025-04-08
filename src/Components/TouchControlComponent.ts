import { Component, PointerEvent, Entity, ScreenAppender, ScreenAppenderOptions, Color, Engine, Vector, vec } from "excalibur";
import { game } from "../main";

type GestureType = "tap" | "hold" | "swipe" | "joystick" | "doubletap";

interface TouchControlConfig {
  holdTime?: number;
  joystickInterval?: number;
  swipeJoystickCutoff?: number;
  doubleTapTime?: number;
  doubleTapDistance?: number;
}

type GestureCallback = (data: {
  direction?: { x: number; y: number };
  distance?: number;
  duration: number;
  velocity?: number;
  rawEvent: any;
}) => void;

export class TouchControlComponent extends Component {
  private gestureCallbacks: Partial<Record<GestureType, GestureCallback>> = {};
  private config: Required<TouchControlConfig> = {
    holdTime: 500,
    joystickInterval: 100,
    swipeJoystickCutoff: 150,
    doubleTapTime: 300,
    doubleTapDistance: 25,
  };

  upHandler: any;
  downHandler: any;
  moveHandler: any;
  cancelHandler: any;

  private gestureStartTime = 0;
  private gestureStartPos = Vector.Zero;
  private moveDelta = Vector.Zero;
  private gestureMoved = false;

  private holdTimer: number | null = null;
  private joystickInterval: number | null = null;
  private lastJoystickTime = 0;
  private swipeSuppressed = false;

  private lastTapTime = 0;
  private lastTapPosition = Vector.Zero;

  private readonly HOLD_TIME = 500;
  private readonly JOYSTICK_INTERVAL = 100;
  private readonly SWIPE_JOYSTICK_CUTOFF = 150;
  private readonly DOUBLE_TAP_TIME = 300;
  private readonly DOUBLE_TAP_DISTANCE = 25;

  onAdd(owner: Entity): void {
    this.owner = owner;
  }

  init(config = {} as TouchControlConfig) {
    this.config = { ...this.config, ...config };

    if (!this.owner) return;
    const primary = this.owner.scene?.engine.input.pointers.primary;
    if (!primary) return;

    this.downHandler = primary.on("down", e => this.onDown(e));
    this.moveHandler = primary.on("move", e => this.onMove(e));
    this.upHandler = primary.on("up", e => this.onUp(e));
    this.cancelHandler = primary.on("cancel", e => this.onCancel());
  }

  onRemove(): void {
    this.upHandler?.remove();
    this.downHandler?.remove();
    this.moveHandler?.remove();
    this.cancelHandler?.remove();
  }

  private onDown(evt: PointerEvent) {
    this.gestureStartTime = performance.now();
    this.gestureStartPos = evt.worldPos;
    this.moveDelta = Vector.Zero;
    this.gestureMoved = false;
    this.swipeSuppressed = false;

    this.clearTimers();

    if (this.gestureCallbacks["hold"]) {
      this.holdTimer = window.setTimeout(() => {
        this.trigger("hold", { duration: this.config.holdTime, rawEvent: evt });
      }, this.config.holdTime);
    }

    if (this.gestureCallbacks["joystick"]) {
      this.joystickInterval = window.setInterval(() => {
        const distance = this.moveDelta.magnitude;
        const direction = this.moveDelta.normalize();
        this.lastJoystickTime = performance.now();
        this.trigger("joystick", {
          direction,
          distance,
          duration: performance.now() - this.gestureStartTime,
          rawEvent: evt,
        });
        this.swipeSuppressed = true;
      }, this.config.joystickInterval);
    }
  }

  onMove(evt: PointerEvent) {
    const dx = evt.worldPos.x - this.gestureStartPos.x;
    const dy = evt.worldPos.y - this.gestureStartPos.y;
    this.moveDelta = vec(dx, dy);
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.gestureMoved = true;
    }
  }

  onUp(evt: PointerEvent) {
    const duration = performance.now() - this.gestureStartTime;
    const distance = Math.hypot(this.moveDelta.x, this.moveDelta.y);
    const velocity = distance / duration;
    const direction = {
      x: this.moveDelta.x / (distance || 1),
      y: this.moveDelta.y / (distance || 1),
    };

    if (!this.gestureMoved && duration < 250) {
      this.trigger("tap", { duration, rawEvent: evt });
    } else if (this.gestureMoved && distance > 30) {
      this.trigger("swipe", { direction, distance, duration, velocity, rawEvent: evt });
    }

    this.resetGestureState();
  }

  onCancel() {
    this.resetGestureState();
  }

  resetGestureState() {
    this.clearTimers();
    this.moveDelta = Vector.Zero;
    this.gestureMoved = false;
    this.swipeSuppressed = false;
  }

  onGesture(type: GestureType, callback: GestureCallback) {
    this.gestureCallbacks[type] = callback;
  }

  private trigger(type: GestureType, data: Parameters<GestureCallback>[0]) {
    this.gestureCallbacks[type]?.(data);
  }

  private clearTimers() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    if (this.joystickInterval) {
      clearInterval(this.joystickInterval);
      this.joystickInterval = null;
    }
  }
}

/*
touch controls require tracking the sequence of events, and a timer, distance, velocit, and direction of the touch

a tap is when a down and up event happen in quick succession
a tap/hold is when a down event happens and the up event is delayed
joystick is when the down event happens and the up event is delayed, but the move event is also triggered
it is important to track the direction of this and map it to a joystick action

a swipe is when the down event happens and the up event is delayed, but the move event is also triggered and the distance moved is greater than a certain threshold
a swipe is also a gesture, but it is not a joystick action, and is import to track its direction
*/
