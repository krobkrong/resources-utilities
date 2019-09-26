import main from "@app/resources/styles/main.css"
import custom from "@app/resources/styles/custom.sass"
import sample from "@app/resources/styles/sample.scss"
import animal from "@app/resources/icons/animal.svg"
import moon from "@app/resources/icons/moon.svg"
import bell from "@app/resources/icons/bell.svg"
import picin from "@app/resources/icons/picin.svg"
import { ResourceModule } from "@krobkrong/resources-utilities"

type ModuleData = { [index: string]: ResourceModule }

declare global {
    interface Window {
        getSvgDts: () => ModuleData
        getCssEmbeddedElement: () => string;
        getCssDts: () => ModuleData
    }
}

window.getSvgDts = () => {
    return { "animal": animal, "moon": moon, "bell": bell, "picin": picin }
}

window.getCssEmbeddedElement = () => {
    return document.head.querySelector("style")!.innerHTML
}

window.getCssDts = () => {
    return { "main": main, "custom": custom, "sample": sample }
}

