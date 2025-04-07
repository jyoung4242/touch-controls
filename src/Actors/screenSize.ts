import { Engine, Font, Label, ScreenElement, vec } from "excalibur";
import { WindowResizeComponent } from "../Components/WindowResize";

export class ScreenSize extends ScreenElement {
  titleLabel: Label;
  constructor(public engine: Engine) {
    super({
      width: 400,
      height: 300,
    });

    this.titleLabel = new Label({
      font: new Font({
        family: "Arial",
        size: 18,
      }),
      pos: vec(10, 10),
      text: `Screen Size: ${engine.screen.width}x${engine.screen.height}`,
    });
    this.addChild(this.titleLabel);
  }

  onInitialize(engine: Engine): void {
    this.addComponent(new WindowResizeComponent());
  }

  onWindowResize() {
    console.log("firing resize event on ScreenSize Element");
    this.titleLabel.text = `Screen Size: ${this.engine.screen.width}x${this.engine.screen.height}`;
  }
}
