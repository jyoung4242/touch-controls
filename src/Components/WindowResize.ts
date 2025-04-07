import type { ComponentCtor, Entity, Engine } from "excalibur";
import { Component } from "excalibur";

type Owner = Entity & {
  engine: Engine;
  onWindowResize: () => void;
};

export class WindowResizeComponent extends Component {
  readonly type = "window-resize";
  declare owner: Owner;

  onResize = () => {
    console.log("window resized");
    console.log(this.owner);

    if (this.owner?.onWindowResize) {
      console.log("calling onWindowResize");

      this.owner.engine.once("predraw", () => {
        this.owner.onWindowResize.call(this.owner);
      });
    }
  };
  onAdd?(owner: Owner): void {
    console.log("WindowResizeComponent added");

    window.addEventListener("resize", this.onResize);
  }

  onRemove?(previousOwner: Owner): void {
    window.removeEventListener("resize", this.onResize);
  }
}
