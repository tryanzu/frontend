import h from 'react-hyperscript';
import classNames from 'classnames';
import helpers from 'hyperscript-helpers';
import { useState, useEffect } from 'react';
import { t } from '../../i18n';
import { Modal } from './modal';
import { requestFlags } from '../../requests';

const tags = helpers(h);
const { div, p, form, input, select, option, textarea } = tags;

export function FlagModal({ isOpen, onRequestClose, ...props }) {
    const [reason, setReason] = useState('');
    const [reasons, setReasons] = useState([]);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const disabled = !reason.length || (reason === 'other' && !content.length);

    // Fetch latest flag reasons and keep them in state.
    useEffect(() => {
        requestFlags().then(setReasons);
    }, []);

    async function onSubmit(event) {
        event.preventDefault();
        if (disabled || sending) {
            return;
        }
        setSending(true);
        await Promise.resolve(props.onSend({ reason, content }));
        setSending(false);
        onRequestClose();
    }

    return h(
        Modal,
        {
            isOpen,
            onRequestClose,
            contentLabel: props.action || 'Feedback',
            className: 'feedback-modal',
        },
        [
            div('.modal-container', { style: { width: '360px' } }, [
                form('.modal-body', { onSubmit }, [
                    props.title && p(props.title),
                    select(
                        '.form-select.w-100.mb2',
                        {
                            value: reason,
                            onChange: event => setReason(event.target.value),
                        },
                        [option({ value: '' }, t`Selecciona un motivo`)].concat(
                            reasons.map(reason =>
                                option({ value: reason }, t`${reason}`)
                            )
                        )
                    ),
                    reason == 'other' &&
                        div('.form-group', [
                            textarea('.form-input', {
                                name: 'description',
                                placeholder: t`Escribe el motivo...`,
                                value: content,
                                onChange: event =>
                                    setContent(event.target.value),
                                rows: 3,
                            }),
                        ]),
                    input('.btn.btn-primary.btn-block', {
                        disabled,
                        type: 'submit',
                        value: props.action || 'Continuar',
                        className: classNames({ loading: sending }),
                    }),
                ]),
            ]),
        ]
    );
}
