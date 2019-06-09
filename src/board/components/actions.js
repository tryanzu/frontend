import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { Fragment, useState } from 'react';
import { t, i18n } from '../../i18n';
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
export function FlagPost(props){
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [category, setCategory] = useState('');
    const reasons = ['violence', 'spam', 'fakenews', 'unauthorizedsales', 'inappropriatelanguage', 'other'];
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
            div('.modal-container', { style: { width: '450px' } }, [
                props.title && div('.modal-title.mb1', props.title),
                h('.divider'),
                    div('.modal-body.items-center-l', [
                      label('.b.form-label', t`Elije un motivo`),
                      select(
                          '.menu.fl.w-100.mb4',
                          {
                              value: category,
                              onChange: event =>
                              setCategory(event.target.value),
                          },
                              reasons.map(reason =>
                              option('.menu-item', t`${reason}`)
                          )
                      ),
                    category == 'Otro' &&
                        textarea('.form-input', {
                            name: 'description',
                            placeholder: t`...`,
                            rows: 3,
                        }),
                    input('.btn.btn-primary.btn-block.', {
                        type: 'submit',
                        disabled: category.length === 0,
                        value: props.action || 'Continuar',
                    }),
                ]),
            ]),
        ]),
    ]);
}
