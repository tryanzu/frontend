import xs from 'xstream';
import delay from 'xstream/extra/delay';
import { AccountModal } from '../../components/modal/account';
import { ConfigModal } from '../../components/modal/config';

export function model(sources, actions) {
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
