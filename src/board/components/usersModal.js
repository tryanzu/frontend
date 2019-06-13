import { useEffect } from 'react';
import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { t, ago } from '../../i18n';
import { throttle } from 'lodash';
import { Link } from 'react-router-dom';
import { BanWithReason } from './actions';

const tags = helpers(h);
const { div, img, figure, ul, li, a } = tags;
const { span, h2, small, i, input } = tags;

const throttledScroll = throttle((bottomReached, effects, { list }) => {
    if (bottomReached) {
        const last = list.length > 0 ? list[list.length - 1].id : false;
        effects.fetchUsers(last);
    }
}, 200);

export function UsersModal({ state, effects, setOpen }) {
    const { users } = state;

    // Initial users fetch the first time the modal is mounted.
    useEffect(() => {
        effects.fetchUsers();
    }, []);

    function onScroll(e) {
        const bottomReached =
            e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight <
            1;
        throttledScroll(bottomReached, effects, users);
    }

    return h(
        Modal,
        {
            isOpen: true,
            onRequestClose: () => setOpen(false),
            ariaHideApp: false,
            contentLabel: t`Herramientas para Usuarios`,
            className: 'users-modal',
            style: {
                overlay: {
                    zIndex: 301,
                    backgroundColor: 'rgba(0, 0, 0, 0.30)',
                },
            },
        },
        div('.modal-container.fade-in', { style: { width: '640px' } }, [
            div('.pa3.flex.items-center', [
                h2('.f5.pa0.flex-auto.w-60.ma0', 'Gestión de usuarios'),
                input('.form-input.input-sm.w-40', {
                    type: 'search',
                    placeholder: 'Buscar usuario...',
                    required: true,
                }),
                a('.btn-icon.ml3', { onClick: () => setOpen(false) }, [
                    span('.icon-cancel'),
                ]),
            ]),
            div(
                '.ph3.pb3.bt.b--light-gray.overflow-y-auto.pt2',
                { onScroll, style: { maxHeight: 600 } },
                users.list.map(user => {
                    return div('.flex.pv2.items-center', { key: user.id }, [
                        figure(
                            '.avatar.tc',
                            {
                                dataset: {
                                    initial: user.username.substr(0, 2),
                                },
                            },
                            [
                                user.image &&
                                    img({
                                        src: user.image,
                                        alt: `Avatar de ${user.username}`,
                                    }),
                            ]
                        ),
                        div('.pl3.lh-title.flex-auto', [
                            h(
                                Link,
                                {
                                    to: `/u/${user.username}/${user.id}`,
                                    onClick: () => {
                                        setOpen(false);
                                    },
                                    className: 'f6',
                                },
                                user.username
                            ),
                            div(
                                '.dib.mr2',
                                {},
                                small(
                                    '.bg-light-gray.br1.gray.ml2',
                                    { style: { padding: '2px 5px' } },
                                    [
                                        i('.icon-crown.gold'),
                                        span(
                                            '.b',
                                            ' ' + String(user.gaming.swords)
                                        ),
                                    ]
                                )
                            ),
                            span(
                                '.ago.db.f7.gray.mt2',
                                t`Miembro desde hace` +
                                    ' ' +
                                    ago(user.created_at)
                            ),
                        ]),
                        div('.w-30.tr.pr3.f7', [
                            user.validated &&
                                span(
                                    '.label.label-sm.label-success',
                                    'Correo validado'
                                ),
                            !user.validated &&
                                span(
                                    '.label.label-sm.label-error',
                                    'Correo sin validar'
                                ),
                        ]),
                        div([
                            div('.dib.v-mid.dropdown.dropdown-right', [
                                a(
                                    {
                                        className:
                                            'dib v-mid btn-icon dropdown-toggle',
                                        tabIndex: 0,
                                    },
                                    h('i.icon-down-open.f7')
                                ),
                                ul('.menu', { style: { width: '200px' } }, [
                                    li(
                                        '.menu-item',
                                        {},
                                        h(
                                            BanWithReason,
                                            {
                                                title: t`¿Por qué quieres banear este usuario?`,
                                                user,
                                                onBan: form =>
                                                    effects.requestUserBan({
                                                        ...form,
                                                        user_id: user.id,
                                                    }),
                                            },
                                            [
                                                i('.mr1.icon-edit'),
                                                t`Banear cuenta`,
                                            ]
                                        )
                                    ),
                                ]),
                            ]),
                        ]),
                    ]);
                })
            ),
        ])
    );
}
