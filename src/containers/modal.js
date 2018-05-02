import { intent } from './modal/intent';
import { model } from './modal/model';
import { view } from './modal/view';

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
