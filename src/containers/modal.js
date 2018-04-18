import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import delay from 'xstream/extra/delay';
import { h } from '@cycle/dom';
import { AccountModal } from '../components/modal/account';
import { ConfigModal } from '../components/modal/config';

function intent({ DOM, fractal }) {
    // DOM read effects.
    const overlayClick$ = DOM.select('.modal-link').events('click');

    // Compute a stream that holds the recent modal put into state. (outside world side effect)
    const modal$ = fractal.state$.compose(
        dropRepeats(
            (a, b) =>
                a.modal.active === b.modal.active &&
                a.modal.modal === b.modal.modal
        )
    );

    return {
        overlayClick$,
        modal$,
    };
}

function model(sources, actions) {
    // Current modal component stream.
    // modal$ will receive an object that tells
    // both current state (enabled|disabled) and
    // the modal "kind" (string).
    // The "delay" avoids losing signals from the inner stream
    // when modal$ changes suddenly. Previously we used flattenConcurrently
    // but it keeps undesired inner streams active.
    const modal$ = actions.modal$
        .compose(delay(60))
        .map(({ modal }) => {
            if (modal.active == false) {
                return { DOM: xs.of(null) };
            }

            switch (modal.modal) {
                case 'account':
                    return AccountModal(sources);
                case 'config':
                    return ConfigModal(sources);
            }
        })
        .remember();

    // Sink getter from modal$ stream.
    // This will get inner stream from current modal stream.
    const sink = (modal$, name) => {
        return modal$.map(m => (name in m ? m[name] : xs.never())).flatten();
    };

    // childSinks computes an object containing all sinks
    // from left param recursively and based in source.
    const childSinks = (source, ...left) => {
        if (left.length > 0) {
            const name = left[0];
            return childSinks(
                { ...source, [name]: sink(source.modal$, name) },
                ...left.slice(1)
            );
        }

        return source;
    };

    /**
     * Modal container state.
     */

    const reducers$ = xs.merge(
        xs.of(() => ({
            modal: { active: false, modal: false, params: {} },
        })),

        // Close modal overlay clicks
        actions.overlayClick$.mapTo(state => ({
            ...state,
            modal: { ...state.modal, active: false },
        })),

        // Child components reducers
        sink(modal$, 'fractal')
    );

    const DOM = sink(modal$, 'DOM');

    return childSinks(
        { modal$, DOM, fractal: reducers$ },
        'HTTP',
        'storage',
        'glue'
    );
}

function view(state$, childVTree$) {
    return xs.combine(state$, childVTree$).map(([state, childVNode]) => {
        if (state.modal.active == false) {
            return h('div');
        }

        return h('div.modal.active', { key: state.modal.modal }, [
            h('div.modal-overlay.modal-link', {
                dataset: { modal: state.modal.modal },
            }),
            childVNode,
        ]);
    });
}

export function Modal(sources) {
    const { DOM, fractal } = sources;

    // Mental note: sources are mostly needed on child modals.
    const actions = intent({ DOM, fractal });
    const effects = model(sources, actions);
    const vtree$ = view(fractal.state$, effects.DOM);

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        storage: effects.storage,
        glue: effects.glue,
        fractal: effects.fractal,
    };
}
