import {intent} from './navbar/intent'
import {model} from './navbar/model'
import {view} from './navbar/view'
import xs from 'xstream'

export function Navbar({DOM, HTTP, storage, fractal}) {
    const actions = intent(DOM, HTTP, storage)
    const effects = model(actions)
    const vdom$ = view(effects, fractal)

    return {
        DOM: vdom$,
        HTTP: effects.HTTP,
        storage: effects.storage$,
        beep: effects.beep$,
        fractal: effects.fractal,
    }
}