import animal from "@app/resources/icons/animal.svg";
import bell from "@app/resources/icons/bell.svg";
import moon from "@app/resources/icons/moon.svg";
import picin from "@app/resources/icons/picin.svg";
import custom from "@app/resources/styles/custom.sass";
import main from "@app/resources/styles/main.css";
import sample from "@app/resources/styles/sample.scss";
import { ResourceModule } from "@krobkrong/resources-utilities";

interface IModuleData { [index: string]: ResourceModule; }

declare global {
    // tslint:disable-next-line: interface-name
    interface Window {
        getSvgDts: () => IModuleData;
        getCssEmbeddedElement: () => string;
        getCssDts: () => IModuleData;
    }
}

window.getSvgDts = () => {
    return { animal, moon, bell, picin };
};

window.getCssEmbeddedElement = () => {
    return document.head.querySelector("style")!.innerHTML;
};

window.getCssDts = () => {
    return { main, custom, sample };
};
