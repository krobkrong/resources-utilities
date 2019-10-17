import custom from "./style/custom.sass";
import sample from "./style/sample.scss";
import main from "./style/main.css";

export function test () {
  return Object.assign({}, custom, sample, main);
}
