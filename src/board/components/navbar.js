import h from 'react-hyperscript';
import qs from 'query-string';
import helpers from 'hyperscript-helpers';
import { adminTools } from '../../acl';
import { ago, t } from '../../i18n';
import { withRouter, Link } from 'react-router-dom';
import { useState } from 'react';
import { DebounceInput } from 'react-debounce-input';
import { ConfigModal } from './configModal';
import { UsersModal } from './usersModal';

const tags = helpers(h);
const { span, a, i, div } = tags;

export const Navbar = withRouter(function Navbar(props) {
    const [config, setConfig] = useState(false);
    const [users, viewUsers] = useState(false);
    const { state } = props;
    const { auth } = state;
    const { user } = auth;
    const image = user.image || '';
    return h('main', [
        adminTools({ user }) &&
            h('header.navbar-tools.fade-in', [
                h('nav', [
                    div('.flex-auto', {}, span('Gestión y Herramientas')),
                    a('.dn.dib-ns.ml3', { onClick: () => viewUsers(true) }, [
                        i('.icon-contacts.mr1'),
                        t`Reportes`,
                    ]),
                    a('.dn.dib-ns.ml3', { onClick: () => viewUsers(true) }, [
                        i('.icon-users.mr1'),
                        t`Gestión de usuarios`,
                    ]),
                    a(
                        '.dn.dib-ns.ml3.modal-link',
                        { onClick: () => setConfig(true) },
                        [i('.icon-cog.mr1'), t`Configuración`]
                    ),
                ]),
            ]),
        h('header.navbar', [
            h(LogoSection, props),
            h(MobileSection, {
                user,
                image,
                ...props,
            }),
            h(DesktopVersion, {
                user,
                image,
                ...props,
            }),
        ]),
        config && h(ConfigModal, { ...props, setOpen: setConfig }),
        users && h(UsersModal, { ...props, setOpen: viewUsers }),
    ]);
});

function LogoSection(props) {
    const { location } = props.history;
    const params = new window.URLSearchParams(location.search);
    const [search, setSearch] = useState(params.get('search') || '');
    function onChange(event) {
        const search = event.target.value;
        setSearch(search);
        props.history.push(`/?${qs.stringify({ search })}`);
    }
    return h('section.navbar-section', [
        h(
            Link,
            { className: 'link', to: '/' },
            h('img.logo.w3', {
                src: props.state.site.logoUrl || '/images/anzu.svg',
                alt: props.state.site.name || '',
            })
        ),
        h(DebounceInput, {
            className: 'search dib dn-ns',
            id: 'search',
            type: 'search',
            value: search,
            debounceTimeout: 600,
            minLength: 3,
            placeholder: t`Buscar...`,
            onChange,
        }),
        h(DebounceInput, {
            className: 'search extended dn dib-ns',
            id: 'search',
            type: 'search',
            value: search,
            debounceTimeout: 600,
            minLength: 3,
            placeholder: t`Buscar publicaciones...`,
            onChange,
        }),
    ]);
}

function NotificationsDropdown({ loading, list }) {
    return h(
        'ul.menu.notifications.tl',
        {},
        loading
            ? h('div.loading.mv2')
            : h(
                  'div.fade-in',
                  {},
                  list.length === 0
                      ? h(
                            'p.tc.mv2',
                            t`No tienes ninguna notificación por el momento.`
                        )
                      : list.map(n => {
                            return h(
                                'li.menu-item',
                                { key: n.id },
                                h(
                                    Link,
                                    {
                                        className: 'pointer link',
                                        to: n.target,
                                    },
                                    [
                                        h('span.db.clean-styles', n.title),
                                        h('span.db.gray', n.subtitle),
                                        h('span.db.mid-gray', ago(n.createdAt)),
                                    ]
                                )
                            );
                        })
              )
    );
}

function NotificationsLink(props) {
    const { notifications, effects } = props;
    return h('div.dropdown.dropdown-right', [
        h(
            'a.dropdown-toggle.pointer.link',
            {
                tabIndex: 0,
                onFocus: () => effects.fetchNotifications(),
            },
            [
                h(
                    'span.badge',
                    {
                        id: 'notifications',
                        className: notifications.count === 0 ? 'none' : '',
                        dataset: { badge: String(notifications.count) },
                    },
                    props.children || []
                ),
            ]
        ),
        h(NotificationsDropdown, { ...notifications }),
    ]);
}

function NavbarLink({ name, href }) {
    const internal = href.substr(0, 4) != 'http';
    return h(
        internal ? Link : 'a',
        internal
            ? {
                  to: href,
                  className: 'btn btn-link',
              }
            : {
                  target: '_blank',
                  className: 'btn btn-link',
                  href,
              },
        name
    );
}

function MobileSection({ user, image, state, effects }) {
    const nav = state.site.nav || [];
    const { notifications } = state;
    return h('section.navbar-section.show-sm.tr', [
        user !== false &&
            h(
                NotificationsLink,
                { notifications, effects },
                h('i.icon-comment.f5')
            ),
        user !== false &&
            h('div.dropdown.dropdown-right.ml2', [
                h('a.dropdown-toggle.pointer.link', { tabIndex: 0 }, [
                    h(
                        'figure.avatar',
                        {
                            dataset: {
                                initial: user.username.substr(0, 1),
                            },
                        },
                        [
                            image.length > 0 &&
                                h('img', {
                                    alt: t`Avatar de ${user.username}`,
                                    src: image,
                                }),
                        ]
                    ),
                ]),
                h('ul.menu.tl', [
                    nav.map(link =>
                        h(NavbarLink, {
                            ...link,
                            key: link.href + link.name,
                        })
                    ),
                    h('li.divider'),
                    h(
                        'li.menu-item',
                        {},
                        h(
                            Link,
                            { to: `/u/${user.username}/${user.id}` },
                            t`Ver mi perfil`
                        )
                    ),
                    h('li.divider'),
                    h('li.menu-item.cf', [
                        h(
                            'div.menu-badge',
                            {},
                            h('label.label.label-primary', user.gaming.swords)
                        ),
                        h('a', t`Reputación`),
                    ]),
                    h('li.menu-item.cf', [
                        h(
                            'div.menu-badge',
                            {},
                            h('label.label.label-primary', user.gaming.tribute)
                        ),
                        h('a', t`Tributo`),
                    ]),
                    h('li.divider'),
                    h(
                        'li.menu-item',
                        { onClick: () => effects.logout() },
                        h('a.pointer', t`Salir de mi cuenta`)
                    ),
                ]),
                user.validated == false &&
                    h(NeedAccountValidation, { user, effects }),
            ]),
        user === false &&
            h('div.dropdown.dropdown-right', [
                h(
                    'a.dropdown-toggle.btn.btn-link',
                    { tabIndex: 0 },
                    h('i.icon.icon-menu')
                ),
                h(
                    'ul.menu.tl',
                    nav
                        .map(link =>
                            h(NavbarLink, {
                                ...link,
                                key: link.href + link.name,
                            })
                        )
                        .concat([
                            h('li.divider'),
                            h(
                                'li.menu-item',
                                {},
                                h(
                                    'a.link.modal-link',
                                    {
                                        onClick: () =>
                                            effects.auth({
                                                modal: true,
                                                tab: 'login',
                                            }),
                                    },
                                    t`Iniciar sesión`
                                )
                            ),
                            h(
                                'li.menu-item',
                                {},
                                h(
                                    'a.link.modal-link',
                                    {
                                        onClick: () =>
                                            effects.auth({
                                                modal: true,
                                                tab: 'signup',
                                            }),
                                    },
                                    t`Únete`
                                )
                            ),
                        ])
                ),
            ]),
    ]);
}

function DesktopVersion({ user, image, state, effects }) {
    const nav = state.site.nav || [];
    const { notifications } = state;
    const missed =
        user !== false &&
        (state.gamification.swords || user.gaming.swords) - user.gaming.swords;

    return h(
        'section.navbar-section.hide-sm',
        nav
            .map(link => h(NavbarLink, { ...link, key: link.href + link.name }))
            .concat([
                h(
                    'a.link.pointer.btn.btn-link.modal-link',
                    {
                        onClick: () =>
                            effects.auth({
                                modal: true,
                                tab: 'login',
                            }),
                        className: user !== false ? 'dn' : '',
                    },
                    t`Iniciar sesión`
                ),
                h(
                    'a.link.pointer.btn.btn-link.modal-link.b',
                    {
                        onClick: () =>
                            effects.auth({
                                modal: true,
                                tab: 'signup',
                            }),
                        className: user !== false ? 'dn' : '',
                    },
                    t`Crear una cuenta`
                ),
                user !== false &&
                    h(
                        NotificationsLink,
                        { notifications, effects },
                        t`Notificaciones`
                    ),
                user !== false &&
                    h('a.link.pointer.btn.btn-link', [
                        h('i.icon-crown.gold'),
                        h('span.b', {}, user.gaming.swords),
                        missed > 0 &&
                            h('span.new-reputation', {}, `+${missed}`),
                        missed < 0 &&
                            h(
                                'span.new-reputation.lost',
                                {},
                                `-${missed * -1}`
                            ),
                    ]),
                user !== false &&
                    h('div.dropdown.dropdown-right', [
                        h(
                            'span.dropdown-toggle.pointer.link',
                            { tabIndex: 0, title: user.username },
                            [
                                h(
                                    'figure.avatar',
                                    {
                                        dataset: {
                                            initial: user.username.substr(0, 1),
                                        },
                                    },
                                    [
                                        image.length > 0
                                            ? h('img', {
                                                  alt: `Avatar de ${user.username}`,
                                                  src: image,
                                              })
                                            : h('div.dn'),
                                    ]
                                ),
                            ]
                        ),
                        h('ul.menu', [
                            h(
                                'li.menu-item',
                                {},
                                h(
                                    Link,
                                    {
                                        className: 'link pointer',
                                        to: `/u/${user.username}/${user.id}`,
                                    },
                                    t`Ver mi perfil`
                                )
                            ),
                            h('li.menu-item.cf', [
                                h(
                                    'div.menu-badge',
                                    {},
                                    h(
                                        'label.label.label-primary',
                                        user.gaming.swords
                                    )
                                ),
                                h('a.pointer', 'Reputación'),
                            ]),
                            /*h('li.menu-item.cf', [
                              h(
                                  'div.menu-badge',
                                  h(
                                      'label.label.label-primary',
                                      user.gaming.tribute
                                  )
                              ),
                              h('a.pointer', 'Tributo'),
                          ]),*/
                            h('li.divider'),
                            h(
                                'li.menu-item',
                                {},
                                h(
                                    'a.pointer',
                                    { onClick: () => effects.logout() },
                                    'Salir de mi cuenta'
                                )
                            ),
                        ]),
                        user.validated == false &&
                            h(NeedAccountValidation, { user, effects }),
                    ]),
            ])
    );
}

export function NeedAccountValidation({ effects }) {
    const [sending, setSending] = useState(false);
    function onClick() {
        if (sending) {
            return;
        }
        setSending(true);
        effects.requestValidationEmail().finally(() => setSending(false));
    }
    return h('div.absolute.top-2.z-2.w5.right-0.toast.shadow.lh-copy.tl.pa3', [
        h('span.b', 'Acción necesaria'),
        h('p.mb1', [
            t`Enviamos a tu correo las instrucciones necesarias para validar tu cuenta. Obtén acceso completo al sitio y únete a la conversación.`,
        ]),
        sending === true && h('div.loading'),
        sending === false &&
            h('a', { onClick }, t`Reenviar correo electrónico`),
    ]);
}
