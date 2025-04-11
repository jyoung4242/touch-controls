import { Component, PointerEvent, Entity, ScreenAppender, ScreenAppenderOptions, Color, Engine, Vector, vec } from "excalibur";
import { game } from "../main";

type GestureType = "tap" | "hold" | "swipe" | "joystick" | "doubletap";

interface TouchControlConfig {
  holdTime?: number;
  joystickInterval?: number;
  swipeJoystickCutoff?: number;
  doubleTapTime?: number;
  doubleTapDistance?: number;
  joystickMoveTolerance?: number;
  // Whether joystick and swipe can be triggered during the same gesture
  exclusiveJoystickSwipe?: boolean;
  // Minimum duration for a gesture to be considered a swipe (ms)
  minSwipeDuration?: number;
  // Maximum duration for a gesture to be considered a swipe (ms)
  maxSwipeDuration?: number;
  // Minimum velocity (pixels/ms) for a gesture to be considered a swipe
  minSwipeVelocity?: number;
  exclusiveTapDoubleTap?: boolean;
}

type GestureCallback = (data: {
  coords?: { screenPos: Vector; worldPos: Vector; pagePos: Vector };
  direction?: { x: number; y: number };
  distance?: number;
  duration: number;
  velocity?: number;
  rawEvent: any;
}) => void;

export class TouchControlComponent extends Component {
  private gestureCallbacks: Partial<Record<GestureType, GestureCallback>> = {};
  private config: Required<TouchControlConfig> = {
    holdTime: 250,
    joystickInterval: 100,
    swipeJoystickCutoff: 150,
    doubleTapTime: 300,
    doubleTapDistance: 5,
    joystickMoveTolerance: 5,
    exclusiveJoystickSwipe: true,
    minSwipeDuration: 50,
    maxSwipeDuration: 1000,
    minSwipeVelocity: 0.5,
    exclusiveTapDoubleTap: true,
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
  private isActive = false;
  private isDown = false;
  private triggerEvent: PointerEvent | null = null;
  private joystickInterval: number | null = null;
  private joystickTimer: number | null = null;
  private lastJoystickTime = 0;
  private joystickActive = false;

  // Double tap tracking properties
  private lastTapTime = 0;
  private lastTapPos = Vector.Zero;
  private doubleTapPending = false;
  private doubleTapTimer: number | null = null;

  private pendingTapEvent: {
    event: PointerEvent;
    time: number;
  } | null = null;

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
  }

  onRemove(): void {
    this.upHandler?.remove();
    this.downHandler?.remove();
    this.moveHandler?.remove();
    this.cancelHandler?.remove();
    this.clearDoubleTapTimer();
  }

  private onDown(evt: PointerEvent) {
    this.gestureStartTime = performance.now();
    this.gestureStartPos = evt.worldPos;
    this.moveDelta = Vector.Zero;
    this.gestureMoved = false;

    this.clearTimers();
    this.holdTimer = 0;
    this.isActive = true;
    this.isDown = true;
    this.triggerEvent = evt;

    if (this.gestureCallbacks["joystick"]) {
      this.joystickInterval = window.setInterval(() => {
        if (!this.isActive || !this.isDown || !this.gestureMoved) return;
        const distance = this.moveDelta.magnitude;
        // Only trigger joystick if we've moved beyond the cutoff threshold
        if (distance >= this.config.swipeJoystickCutoff) {
          const direction = this.moveDelta.normalize();
          this.lastJoystickTime = performance.now();
          this.joystickActive = true;

          this.trigger("joystick", {
            direction,
            distance,
            duration: performance.now() - this.gestureStartTime,
            rawEvent: evt,
          });
        }
      }, this.config.joystickInterval);
    }
  }

  onMove(evt: PointerEvent) {
    const dx = evt.worldPos.x - this.gestureStartPos.x;
    const dy = evt.worldPos.y - this.gestureStartPos.y;

    this.moveDelta = vec(dx, dy);
    if (Math.abs(dx) > this.config.joystickMoveTolerance || Math.abs(dy) > this.config.joystickMoveTolerance) {
      this.gestureMoved = true;
    }
  }

  onUp(evt: PointerEvent) {
    if (!this.isDown) return;

    this.isDown = false;
    this.isActive = false;
    this.holdTimer = null;
    this.triggerEvent = null;
    const duration = performance.now() - this.gestureStartTime;
    const distance = Math.hypot(this.moveDelta.x, this.moveDelta.y);
    const velocity = distance / Math.max(duration, 1); // Avoid division by zero
    const direction = {
      x: this.moveDelta.x / (distance || 1),
      y: this.moveDelta.y / (distance || 1),
    };

    if (!this.gestureMoved && duration < 250) {
      const currentTime = performance.now();

      // Handle potential double tap
      if (this.doubleTapPending) {
        // Check if this tap is close enough to the last one in time and space
        const timeSinceLastTap = currentTime - this.lastTapTime;
        const distanceFromLastTap = Vector.distance(evt.worldPos, this.lastTapPos);

        if (timeSinceLastTap <= this.config.doubleTapTime && distanceFromLastTap <= this.config.doubleTapDistance) {
          // This is a double tap!
          this.trigger("doubletap", {
            coords: { screenPos: evt.screenPos, worldPos: evt.worldPos, pagePos: evt.pagePos },
            duration: timeSinceLastTap,
            rawEvent: evt,
          });

          // Reset double tap state
          this.doubleTapPending = false;
          this.clearDoubleTapTimer();
        } else {
          // Too far apart or too slow, treat as a new single tap

          // Trigger the previously pending tap first (if we're not in exclusive mode)
          if (!this.config.exclusiveTapDoubleTap && this.pendingTapEvent) {
            this.triggerTapEvent(this.pendingTapEvent.event, this.pendingTapEvent.time);
          }

          // Then queue this tap
          this.queueTapEvent(evt, currentTime);
        }
      } else {
        // First tap, queue it and wait for potential second tap
        //if there is no doubletap callback, immediately trigger the tap event
        if (!this.gestureCallbacks["doubletap"]) {
          this.triggerTapEvent(evt, currentTime);
        } else this.queueTapEvent(evt, currentTime);
      }
    } else if (this.gestureMoved && distance > 30) {
      // Check if we should trigger a swipe
      const isValidSwipe =
        duration >= this.config.minSwipeDuration &&
        duration <= this.config.maxSwipeDuration &&
        velocity >= this.config.minSwipeVelocity;

      // Only trigger swipe if:
      // 1. It's a valid swipe based on criteria above
      // 2. Either joystick isn't exclusive with swipe OR joystick wasn't active during this gesture
      if (isValidSwipe && (!this.config.exclusiveJoystickSwipe || !this.joystickActive)) {
        this.trigger("swipe", {
          direction,
          distance,
          duration,
          velocity,
          rawEvent: evt,
        });
      }

      if (this.gestureCallbacks["joystick"]) {
        this.gestureMoved = false;
        this.clearTimers();
      }

      this.resetGestureState();
    }
  }

  private queueTapEvent(evt: PointerEvent, currentTime: number) {
    // Store the tap event for potential later triggering
    this.pendingTapEvent = {
      event: evt,
      time: currentTime,
    };

    // Set up for potential double tap
    this.lastTapTime = currentTime;
    this.lastTapPos = evt.worldPos.clone();
    this.doubleTapPending = true;

    // Clear double tap state after timeout and possibly trigger tap
    this.clearDoubleTapTimer();
    this.doubleTapTimer = window.setTimeout(() => {
      console.log("Double tap timer expired, triggering pending tap event if any");
      console.log(this.pendingTapEvent);

      // Double tap window expired, trigger the pending tap if it exists
      if (this.pendingTapEvent) {
        // Only trigger the tap if we're not in exclusive mode or if we are
        // and there was no double tap detected

        if (!this.config.exclusiveTapDoubleTap) {
          this.triggerTapEvent(this.pendingTapEvent.event, this.pendingTapEvent.time);
        }
        this.pendingTapEvent = null;
      }
      this.doubleTapPending = false;
      this.doubleTapTimer = null;
    }, this.config.doubleTapTime);
  }

  private triggerTapEvent(evt: PointerEvent, startTime: number) {
    console.log("Triggering tap event", evt, startTime);

    this.trigger("tap", {
      coords: { screenPos: evt.screenPos, worldPos: evt.worldPos, pagePos: evt.pagePos },
      duration: startTime - this.gestureStartTime,
      rawEvent: evt,
    });
  }

  private clearDoubleTapTimer() {
    if (this.doubleTapTimer !== null) {
      clearTimeout(this.doubleTapTimer);
      this.doubleTapTimer = null;
    }
  }

  resetGestureState() {
    this.clearTimers();
    this.moveDelta = Vector.Zero;
    this.gestureMoved = false;
  }

  onGesture(type: GestureType, callback: GestureCallback) {
    this.gestureCallbacks[type] = callback;
  }

  private trigger(type: GestureType, data: Parameters<GestureCallback>[0]) {
    this.gestureCallbacks[type]?.(data);
  }

  private clearTimers() {
    if (this.holdTimer) {
      this.holdTimer = null;
    }
    if (this.joystickInterval) {
      clearInterval(this.joystickInterval);
      this.joystickInterval = null;
    }
  }

  update(engine: Engine, elapsed: number): void {
    if (!this.isActive) return;

    if (this.isDown && this.holdTimer != null && !this.gestureMoved) {
      this.holdTimer += elapsed;
      if (this.holdTimer > this.config.holdTime) {
        this.trigger("hold", {
          coords: { screenPos: this.gestureStartPos, worldPos: this.gestureStartPos, pagePos: this.gestureStartPos },
          duration: this.holdTimer as number,
          rawEvent: this.triggerEvent as PointerEvent,
        });
      }
    }
  }
}
