import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { Fragment, useState } from 'react';
const tags = helpers(h);
const { div, a, form, input } = tags;

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

export function banAUser(props) {
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
                        h('.divider'),
                        div('.modal-body', '.items-center-l', [
                            h('a.btn.btn-primary.mr3-ns.mb-2.br4-ns', 'Abuse'),
                            h('a.btn.btn-primary.mr3-ns.mb-2.br4-ns', 'Spam'),
                            h('a.btn.btn-primary.mr3-ns.mb-2.br4-ns', 'Rude'),
                            h('a.btn.btn-primary.mb-2.br4-ns', 'Spoofing'),
                            h(
                                'a.post-action.btn.btn-primary.mb-2.br4-ns.icon-search-outline',
                                'Otro motivo'
                            ),
                            h('.divider'),
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
