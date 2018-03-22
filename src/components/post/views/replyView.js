import autosize from 'autosize'
import { div, a, ul, li, i, span, img, form, textarea, button } from '@cycle/dom'
import { t } from '../../../i18n'

export function replyView(props) {
    const { state, type, id } = props
    const { user } = state.shared
    const { ui } = state.own
    const nested = props.nested || false

    // Textarea mutable props...
    let textareaProps = { value: '' }

    const inactive = ui.commenting == false || ui.commentingType !== type || ui.commentingId != id
    if (!inactive) {
        textareaProps.value = ui.reply
    }

    return div('.comment.flex.fade-in', { class: { pb3: nested == false, pt3: nested } }, [
        a({ attrs: { href: '/', rel: 'author' } }, [
            div(
                user.image 
                    ? img({ attrs: { src: user.image, alt: `Avatar de ${user.username}` } })
                    : div('.empty-avatar', user.username.substr(0, 1))
            ),
        ]),
        form('.pl2.flex-auto.fade-in.reply-form', { dataset: { type, id } }, [
            textarea('.form-input.replybox.mb2', {
                hook: {
                    insert: vnode => {
                        if (nested) {
                            debounce(vnode => vnode.elm.focus(), 100)(vnode)
                        }
                        autosize(vnode.elm)

                        const mentions = new Tribute({
                            values: [
                                { key: 'nobody', value: 'nobody' },
                                { key: 'TestUser1', value: 'testuser1' }
                            ]
                        })

                        mentions.attach(vnode.elm)
                    }
                },
                dataset: { type, id },
                props: textareaProps,
                attrs: {
                    rows: 1,
                    placeholder: t`Escribe aquí tu respuesta...`,
                    autofocus: nested
                }
            }),
            div('.tr', { class: { dn: ui.commenting == false || ui.commentingType !== type || ui.commentingId != id } }, [
                button('.btn.btn-primary.mr2', { attrs: { type: 'submit' } }, t`Publicar comentario`),
                button('#cc.btn', { attrs: { type: 'reset' } }, t`Cancelar`),
            ])
        ])
    ])
}