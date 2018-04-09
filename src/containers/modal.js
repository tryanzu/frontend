import xs from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'
import flattenConcurrently from 'xstream/extra/flattenConcurrently'
import { h } from '@cycle/dom'
import { AccountModal } from '../components/modal/account'
import { ConfigModal } from '../components/modal/config'

function intent({ DOM, fractal }) {

    // DOM read effects.
    const overlayClick$ = DOM.select('.modal-link').events('click')

    // Compute a stream that holds the recent modal put into state. (outside world side effect)
    const modal$ = fractal.state$
        .compose(dropRepeats((a, b) => (a.modal.active === b.modal.active && a.modal.modal === b.modal.modal)))

    return {
        overlayClick$,
        modal$
    }
}

function model(sources, actions) {

    // Current modal component stream.
    // modal$ will receive an object that tells 
    // both current state (enabled|disabled) and
    // the modal "kind" (string)
    const modal$ = actions.modal$
        .map(({ modal }) => {
            if (modal.active == false) {
                return { DOM: xs.of({}) }
            }

            switch (modal.modal) {
                case 'account':
                    return AccountModal(sources)
                case 'config':
                    return ConfigModal(sources)
                default:
                    return { DOM: xs.never() }
            }
        })
        .remember()
     
    // Sink getter from modal$ stream.
    // This will get inner stream from current modal stream. 
    // flattenConcurrently avoids losing signals from the inner stream  
    // when modal$ changes suddenly.
    const sink = (modal$, name) => {
        return modal$
            .map(m => name in m ? m[name] : xs.never())
            .compose(flattenConcurrently)
    }

    // childSinks computes an object containing all sinks 
    // from left param recursively and based in source.
    const childSinks = (source, ...left) => {
        if (left.length > 0) {
            const name = left[0]
            return childSinks({...source, [name]: sink(source.modal$, name)}, ...left.slice(1))
        }

        return source
    } 

    /**
     * Modal container state.
     */ 
    const reducers$ = xs.merge(
        xs.of(state => ({ modal: { active: false, modal: false, params: {} } })),

        // Close modal overlay clicks
        actions.overlayClick$.mapTo(state => ({ ...state, modal: { ...state.modal, active: false } })),

        // Child components reducers
        sink(modal$, 'fractal'),
    )

    return childSinks(
        { modal$, fractal: reducers$ }, 
        'DOM',
        'HTTP',
        'storage',
        'glue',
    )
}

function view(state$, childVTree$) {
    return xs.combine(state$, childVTree$).map(([state, childVNode]) => {
            if (state.modal.active == false) {
                return h('div')
            }

            return h('div.modal.active', [
                h('div.modal-overlay.modal-link', { dataset: { modal: state.modal.modal } }),
                childVNode
            ])
        }
    )
}

export function Modal(sources) {
    const { DOM, HTTP, fractal, glue, storage } = sources

    // Mental note: sources are mostly needed on child modals.
    const actions = intent({ DOM, fractal })
    const effects = model(sources, actions)
    const vtree$ = view(fractal.state$, effects.DOM)

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        storage: effects.storage,
        glue: effects.glue,
        fractal: effects.fractal,
    }
}