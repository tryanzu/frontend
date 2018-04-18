import { intent } from './navbar/intent';
import { model } from './navbar/model';
import { view } from './navbar/view';

export function Navbar(sources) {
    const { fractal } = sources;
    const actions = intent(sources);
    const effects = model(actions);
    const vdom$ = view(effects, fractal);

    return {
        DOM: vdom$,
        HTTP: effects.HTTP,
        storage: effects.storage$,
        beep: effects.beep$,
        fractal: effects.fractal,
    };
}
