// resources.ts
import { ImageSource, Loader, Sprite, SpriteSheet } from "excalibur";
import dudeImage from "./Assets/dude.png"; // replace this
import map from "./Assets/map.png"; // replace this

export const Resources = {
  dude: new ImageSource(dudeImage),
  map: new ImageSource(map),
};

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}
