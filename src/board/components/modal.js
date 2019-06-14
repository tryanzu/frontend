import h from 'react-hyperscript';
import ReactModal from 'react-modal';

export function Modal({ children, ...props }) {
    return h(
        ReactModal,
        {
            ariaHideApp: false,
            style: {
                overlay: {
                    zIndex: 301,
                    backgroundColor: 'rgba(0, 0, 0, 0.30)',
                },
            },
            ...props,
        },
        children
    );
}
