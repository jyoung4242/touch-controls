// main.ts
import "./style.css";

import { UI } from "@peasy-lib/peasy-ui";
import { Engine, DisplayMode } from "excalibur";
import { model, template } from "./UI/UI";
import { loader } from "./resources";
import { Dude } from "./Actors/dude";
import { TestMap } from "./Actors/map";
import { ScreenSize } from "./Actors/screenSize";

await UI.create(document.body, model, template).attached;

const game = new Engine({
  canvasElementId: "cnv", // the DOM canvas element ID, if you are providing your own
  viewport: { width: 320, height: 288 },
  resolution: { width: 320, height: 288 },
  displayMode: DisplayMode.FitScreenAndFill, // the display mode
  pixelArt: true,
  pixelRatio: 3,
});

export const screen = game.screen;

await game.start(loader);

game.add(new TestMap());
game.add(new Dude(0, 64));
game.add(new ScreenSize(game));
