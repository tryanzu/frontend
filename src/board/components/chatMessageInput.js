import { useState, memo } from 'react';
import Tribute from '../../drivers/tribute';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { glueEvent } from '../utils';
import { requestMentionable } from '../../requests';

const { a, div, input, form, p } = helpers(h);

async function fetchUsers(query, callback) {
    if (!query) return;
    const users = await requestMentionable(query);
    callback(users.map(user => ({ name: user.Username, id: user.Username })));
}

export const ChatMessageInput = memo(function({ state, effects, chan }) {
    const [message, setMessage] = useState('');
    function onSubmit(event) {
        event.preventDefault();
        if (message === '') {
            return;
        }
        state.realtime.send(glueEvent('chat:message', { msg: message, chan }));
        setMessage('');
    }
    return form('.pa3', { onSubmit }, [
        !state.authenticated &&
            div('.flex.flex-wrap.mb3', [
                p('.mb0.mh-auto', [
                    t`Para utilizar el chat `,
                    a(
                        '.link.modal-link.pointer',
                        {
                            onClick: () =>
                                effects.auth({
                                    modal: true,
                                    tab: 'login',
                                }),
                        },
                        t`inicia sesión`
                    ),
                    t`, o si aún no tienes una cuenta, `,
                    a(
                        '.link.modal-link.pointer',
                        {
                            onClick: () =>
                                effects.auth({
                                    modal: true,
                                    tab: 'signup',
                                }),
                        },
                        t`registrate`
                    ),
                ]),
            ]),
        h(
            Tribute,
            {
                onChange: event => setMessage(event.target.value),
                options: {
                    collection: [
                        {
                            values: fetchUsers,
                            lookup: 'name',
                            fillAttr: 'name',
                        },
                    ],
                },
            },
            [
                input('.form-input', {
                    disabled: false === state.authenticated,
                    placeholder: t`Escribe aquí tu mensaje...`,
                    value: message,
                    type: 'text',
                    autoFocus: true,
                    onChange: event => setMessage(event.target.value),
                }),
            ]
        ),
    ]);
});
