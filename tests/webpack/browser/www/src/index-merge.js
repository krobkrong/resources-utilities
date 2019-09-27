import icons from '../resources/icons';
import styles from "../resources/styles"

window.getSvgEmbeddedElement = () => {
    let elements = [];
    Object.entries(icons).forEach((key, _) => {
        if (Array.isArray(key)) {
            if (typeof key[1] === "string") {
                elements.push(document.querySelector(`#${key[1]}`))
            }
        }
    })
    return elements
}

window.getSvgDts = () => {
    return icons
}

window.getCssEmbeddedElement = () => {
    return document.head.querySelector("style").innerHTML
}

window.getCssDts = () => {
    return styles
}

