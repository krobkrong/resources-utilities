import { loader } from "webpack";

export default function (this: loader.LoaderContext, _: string) {
   return "{ fake: 'css' }"
}