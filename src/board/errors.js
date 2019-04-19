import React from 'react';
import h from 'react-hyperscript';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return h(
                'div.toast.toast-error.mb2.lh-copy',
                'Ocurrió un error al intentar renderizar este contenido. Por seguridad hemos evitado su visualización y revisaremos la incidencia en breve.'
            );
        }

        return this.props.children;
    }
}
