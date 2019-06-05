import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { Fragment, useState } from 'react';
import { t } from '../../i18n';
const tags = helpers(h);
const { div, a, form, input, select, option, textarea } = tags;

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
                                        t`Escribe el motivo de esta acción...`,
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
    const [category, setCategory] = useState('');
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
                        div('.modal-body.items-center-l', [
                            select(
                                '.menu.fl.w-100.mb2',
                                {
                                    value: category,
                                    onChange: event =>
                                        setCategory(event.target.value),
                                },
                                [
                                    option('.menu-item', t`Abuso`),
                                    option('.menu-item', t`Spam`),
                                    option('.menu-item', t`Grosero`),
                                    option('.menu-item', t`Suplantación`),
                                    option('.menu-item', t`Otro`),
                                ]
                            ),
                            // Console.log(category),
                            // h(category),
                            category == 'Otro' &&
                                textarea('.form-input', {
                                    name: 'description',
                                    placeholder: t`ej. Por burro`,
                                    rows: 3,
                                }),
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
