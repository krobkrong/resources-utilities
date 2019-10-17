import main from "../resources/styles/main.css";
import custom from "../resources/styles/custom.sass";
import sample from "../resources/styles/sample.scss";
import animal from "../resources/icons/animal.svg";
import moon from "../resources/icons/moon.svg";
import bell from "../resources/icons/bell.svg";
import picin from "../resources/icons/picin.svg";

window.getSvgDts = () => {
  return { animal: animal, moon: moon, bell: bell, picin: picin };
};

window.getCssEmbeddedElement = () => {
  return document.head.querySelector("style").innerHTML;
};

window.getCssDts = () => {
  return { main: main, custom: custom, sample: sample };
};
