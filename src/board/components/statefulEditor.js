import { Component } from 'react';
import h from 'react-hyperscript';
import RichTextEditor from 'react-rte';

export class StatefulEditor extends Component {
    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
        this.state = {
            value: RichTextEditor.createEmptyValue(),
        };
    }

    onChange(value) {
        this.setState({ value });
        if (this.props.onChange) {
            // Send the changes up to the parent component as an HTML string.
            // This is here to demonstrate using `.toString()` but in a real app it
            // would be better to avoid generating a string on each change.
            this.props.onChange(value.toString('markdown'));
        }
    }

    render() {
        // eslint-disable-next-line no-unused-vars
        const { onChange, ...props } = this.props;
        return h(RichTextEditor, {
            value: this.state.value,
            onChange: this.onChange,
            placeholder: 'Escribe aquí tu respuesta',
            ...props,
        });
    }
}
