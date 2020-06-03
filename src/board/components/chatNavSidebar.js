import classNames from 'classnames';
import { Link } from 'react-router-dom';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { adminTools } from '../../acl';
import { ChatChannelSettingsModal } from '../components/actions';

const tags = helpers(h);
const { div, i, h1, h4, span, header, nav, a, section } = tags;

export function ChatNavSidebar(props) {
    const { channels, active, auth, effects, counters, online } = props;
    return div('#channels.flex-shrink-0.flex-ns.flex-column.dn', [
        div('.flex-auto.flex.flex-column', [
            header('.flex.items-center.ph3', [h1('.f5.dib.v-mid', t`Canales`)]),
            nav(
                '.flex-auto',
                channels
                    .map(channel =>
                        h(
                            Link,
                            {
                                key: channel.name,
                                to: `/chat/${channel.name}`,
                                className: classNames('db pa2 ph3', {
                                    active: channel.name === active,
                                }),
                            },
                            `#${channel.name}`
                        )
                    )
                    .concat([
                        adminTools({ user: auth.auth.user }) &&
                            h('div.tc.mt2', {}, [
                                h(
                                    ChatChannelSettingsModal,
                                    {
                                        channel: {
                                            name: '',
                                            description: '',
                                            youtubeVideo: '',
                                            twitchVideo: '',
                                        },
                                        effects,
                                    },
                                    [
                                        span(
                                            '.btn.btn-sm.btn-primary',
                                            t`Agregar Canal`
                                        ),
                                    ]
                                ),
                            ]),
                    ])
            ),
            section('.flex.flex-column.peers', [
                header('.ph3.pv2', [
                    h4('.dib.v-mid.mb0', t`Conectados`),
                    a('.dib.btn-icon.ml4.dropdown-toggle', {}, [
                        span('.bg-green.br-100.dib.mr1', {
                            style: { width: 10, height: 10 },
                        }),
                        span('.online.b', String(online)),
                    ]),
                ]),
                nav(
                    '.flex-auto.overflow-y-auto',
                    (counters.peers || []).map(([id, username]) =>
                        h(
                            Link,
                            {
                                key: id,
                                to: `/chat/u:${id}`,
                                className: classNames('db pa2 ph3', {
                                    active: `u:${id}` === active,
                                }),
                            },
                            [i('.icon-user.mr2'), `${username}`]
                        )
                    )
                ),
            ]),
        ]),
    ]);
}
