import { section, footer, small } from '@cycle/dom';
import { t } from '../../i18n';
import { toastsView } from './views/toastsView';
import { postView } from './views/postView';

export function view(state$) {
    return state$.map(state => {
        return section('.fade-in.post.relative.flex.flex-column.pb3', [
            toastsView({ state }),
            postView({ state }),
            footer('.pa3.pt4', [
                small(
                    '.silver',
                    t`Powered by Anzu community software v0.1 alpha`
                ),
            ]),
        ]);
    });
}
