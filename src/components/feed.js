import { intent } from './feed/intent';
import { model } from './feed/model';
import { view } from './feed/view';

export function Feed(sources) {
    const actions = intent(sources);
    const effects = model(actions);
    const vtree$ = view(sources.fractal.state$);

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        history: effects.history,
        linkPost: effects.linkPost$,
        fractal: effects.fractal,
    };
}
