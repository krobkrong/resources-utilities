import custom from '@module/style/custom.sass'
import sample from '@module/style/sample.scss'
import main from '@module/style/main.css'

export function test() {
   return Object.assign({}, custom, sample, main)
}