import xs from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import delay from 'xstream/extra/delay'
import merge from 'lodash/merge'
import {intent} from './post/intent'
import {model} from './post/model'
import {view} from './post/view'

export function Post({ DOM, HTTP, fractal, props }) {
    const actions = intent({ DOM, HTTP, props })
    const effects = model(actions)
    const vtree$ = view(fractal.state$)

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        fractal: effects.fractal
    }
}