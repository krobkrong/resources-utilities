import icons from '../resources/icons';
import styles from "../resources/styles"

window.getSvgEmbeddedElement = () => {
    let elements = [];
    Object.keys(icons).forEach(key => {
        if (typeof icons[key] === "string") {
            elements.push(document.querySelector(`#${icons[key]}`))
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

