import icons from "@app/resources/icons"
import styles from "@app/resources/styles"

type OptionalElement = Element | null

declare global {
    interface Window {
        getSvgEmbeddedElement: () => OptionalElement[];
        getCssEmbeddedElement: () => string;
        getSvgDts: () => { [index: string]: string }
        getCssDts: () => { [index: string]: string }
    }
}

window.getSvgEmbeddedElement = (): OptionalElement[] => {
    let elements: OptionalElement[] = [];
    elements.push(document.querySelector(`#${icons.animal}`))
    elements.push(document.querySelector(`#${icons.bell}`))
    elements.push(document.querySelector(`#${icons.moon}`))
    elements.push(document.querySelector(`#${icons.picin}`))
    return elements
}
window.getSvgDts = () => {
    return icons
}

window.getCssEmbeddedElement = () => {
    return document.head.querySelector("style")!.innerHTML
}

window.getCssDts = () => {
    return styles
}

