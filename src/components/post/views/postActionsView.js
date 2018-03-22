import { div, a, ul, li, i, span } from '@cycle/dom'
import { t } from '../../../i18n'
import { adminTools } from '../../../acl';

export function postActionsView({ state }) {
    const { user } = state.shared
    const { post, ui } = state.own

    if (ui.updating === true) {
        return div([
            a('.dib.btn-icon.gray.post-action', { dataset: { action: 'cancel', id: post.id } }, i('.icon-cancel')),
        ]) 
    }

    if (post.user_id === user.id || adminTools({ user })) {
        return div('.dropdown.dropdown-right', [
            a('.dib.btn-icon.gray.ml2.dropdown-toggle', { attrs: { tabindex: 0 } }, i('.icon-cog')),
            ul('.menu', { style: { width: '200px' } }, [
                li('.menu-item', a('.pointer.post-action', { dataset: { action: 'update', id: post.id } }, [i('.icon-edit'), t`Editar publicación`])),
                li('.menu-item', a('.pointer.post-action', { dataset: { action: 'delete', id: post.id } }, [i('.icon-trash'), t`Borrar publicación`])),
            ])
        ])
    }

    return div([
        a('.dib.btn-icon.gray', [i('.icon-warning-empty'), span('.ml1', t`Reportar`)]),
    ])
}