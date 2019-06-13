import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { Fragment, useState } from 'react';
import { t, i18n } from '../../i18n';
import classNames from 'classnames';

const tags = helpers(h);
const { div, a, form, input, select, option, textarea, label } = tags;

export function ConfirmWithReasonLink(props) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    function onSubmit(event) {
        event.preventDefault();
        if (reason.length === 0) {
            return;
        }
        setReason('');
        setOpen(false);
        props.onConfirm(reason);
    }
    return h(Fragment, [
        a(
            '.pointer.post-action',
            {
                onClick: () => setOpen(true),
            },
            props.children || []
        ),
        open === true &&
            h(
                Modal,
                {
                    isOpen: open,
                    onRequestClose: () => setOpen(false),
                    ariaHideApp: false,
                    contentLabel: props.action || 'Feedback',
                    className: 'feedback-modal',
                    style: {
                        overlay: {
                            zIndex: 301,
                            backgroundColor: 'rgba(0, 0, 0, 0.30)',
                        },
                    },
                },
                [
                    div('.modal-container', { style: { width: '360px' } }, [
                        props.title && div('.modal-title.mb3', props.title),
                        form({ onSubmit }, [
                            div('.form-group', [
                                input('.form-input', {
                                    onChange: event =>
                                        setReason(event.target.value),
                                    value: reason,
                                    type: 'text',
                                    placeholder:
                                        props.placeholder ||
                                        'Escribe el motivo de esta acción...',
                                    required: true,
                                    autoFocus: true,
                                }),
                            ]),
                            input('.btn.btn-primary.btn-block', {
                                type: 'submit',
                                disabled: reason.length === 0,
                                value: props.action || 'Continuar',
                            }),
                        ]),
                    ]),
                ]
            ),
    ]);
}
export function Flag(props) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const reasons = ['spam', 'rude', 'duplicate', 'needs_review', 'other'];
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const disabled = !reason.length || (reason === 'other' && !content.length);

    async function onSubmit(event) {
        event.preventDefault();
        if (disabled || sending) {
            return;
        }
        setSending(true);
        await Promise.resolve(props.onFlag({ reason, content }));
        setSending(false);
        setOpen(false);
    }

    return h(Fragment, [
        a(
            '.pointer.post-action',
            {
                onClick: () => setOpen(true),
            },
            props.children || []
        ),
        open === true &&
            h(
                Modal,
                {
                    isOpen: open,
                    onRequestClose: () => setOpen(false),
                    ariaHideApp: false,
                    contentLabel: props.action || 'Feedback',
                    className: 'feedback-modal',
                    style: {
                        overlay: {
                            zIndex: 301,
                            backgroundColor: 'rgba(0, 0,f 0, 0.30)',
                        },
                    },
                },
                [
                    div('.modal-container', { style: { width: '450px' } }, [
                        form('.modal-body', { onSubmit }, [
                            props.title &&
                                div(
                                    '.b..modal-title.icon-warning-empty',
                                    props.title
                                ),
                            h('.divider'),
                            label('.form-label', t`Elije un motivo`),
                            select(
                                '.menu.fl.w-100.mb3',
                                {
                                    value: reason,
                                    onChange: event =>
                                        setReason(event.target.value),
                                },
                                [
                                    option(
                                        { value: '' },
                                        t`Selecciona una opcion`
                                    ),
                                ].concat(
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
                            input('.btn.btn-primary.btn-block.', {
                                disabled,
                                type: 'submit',
                                value: props.action || 'Continuar',
                                className: classNames({ loading: sending }),
                            }),
                        ]),
                    ]),
                ]
            ),
    ]);
}
