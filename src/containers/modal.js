import { h } from '@cycle/dom'
import xs from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'
import flattenSequentially from 'xstream/extra/flattenSequentially'
import { AccountModal } from '../components/modal/account'

// Helper to get child streams.
const childSink = name => component => (name in component ? component[name] : xs.never())

export function Modal({ DOM, HTTP, fractal, glue, storage }) {
    const overlayClick$ = DOM.select('.modal-link').events('click')

    const child$ = fractal.state$
        .compose(dropRepeats((a, b) => (a.active === b.active && a.modal === b.modal)))
        .map(({ active, modal }) => {
            if (active == false) {
                return { DOM: xs.of({}) }
            }

            switch (modal) {
                case 'account':
                    return AccountModal({ DOM, HTTP, fractal, glue, storage })
                default:
                    return { DOM: xs.never() }
            }
        })
        .remember()

    const childVTree$ = child$.map(childSink('DOM')).flatten()
    const vtree$ = xs.combine(fractal.state$, childVTree$).map(([state, childVNode]) => {
            if (state.active == false) {
                return h('div')
            }

            return h('div.modal.active', [
                h('div.modal-overlay.modal-link', { dataset: { modal: state.modal } }),
                childVNode
            ])
        }
    )

    const reducers$ = xs.merge(
        xs.of(state => ({ active: false, modal: false, params: {} })),

        // Close modal overlay clicks
        overlayClick$.mapTo(state => ({ ...state, active: false })),

        // Child components reducers
        child$.map(childSink('fractal')).flatten(),
    )

    return {
        DOM: vtree$,
        HTTP: child$.map(childSink('HTTP')).flatten(),
        storage: child$.map(childSink('storage')).flatten().debug(),
        glue: child$.map(childSink('glue')).flatten(),
        fractal: reducers$,
    }
}