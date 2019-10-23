import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import TributeJS from 'tributejs';
import deepEqual from 'deep-equal';
import PropTypes from 'prop-types';
import h from 'react-hyperscript';

const { arrayOf, func, node, object, oneOfType, shape } = PropTypes;

export default class Tribute extends Component {
  static propTypes = {
    customRef: func,
    children: node,
    onChange: func,
    options: shape({
      collections: arrayOf(arrayOf(object)),
      values: arrayOf(object),
      lookup: func,
      menuContainer: oneOfType([object, func]),
    }).isRequired,
  }

  static defaultProps = {
    onChange: () => {},
  }

  children = []
  listeners = []
  tribute = null

  componentDidMount() {
    this.bindToChildren();
  }

  componentDidUpdate() {
    if (this.tribute) {
      // TODO handle the case where other options have changed

      if (this.props.options.values) {
        this.tribute.append(0, this.props.options.values, true /* replace */);
      } else if (this.props.options.collections) {
        this.props.options.collections.forEach((collection, index) => {
          this.tribute.append(index, collection, true /* replace */);
        });
      }
    } else {
      this.bindToChildren();
    }
  }

  shouldComponentUpdate(nextProps) {
    return (!deepEqual(nextProps, this.props));
  }

  bindToChildren = () => {
    const { customRef, options } = this.props;

    const realOptions = {
      ...options
    };

    if (typeof options.menuContainer === 'function') {
      const node = options.menuContainer();

      if (node instanceof Component) {
        realOptions.menuContainer = ReactDOM.findDOMNode(node);
      } else {
        realOptions.menuContainer = node;
      }
    }

    (customRef ? [customRef()] : this.children).forEach((child) => {
      const node = child instanceof Component ? ReactDOM.findDOMNode(child) : child;

      const t = new TributeJS({
        ...realOptions,
      });

      t.attach(node);

      this.tribute = t;

      const listener = this.handleTributeReplaced.bind(this);
      node.addEventListener(
        'tribute-replaced',
        listener
      );
      this.listeners.push(listener);
    });
  }

  handleTributeReplaced = (event) => {
    this.props.onChange(event);
  }

  render() {
    const { children, options: _, customRef: __, onChange: ___, ...props } = this.props;

    return h('div', {...props}, React.Children.map(children, (element, index) => {
        return React.cloneElement(element, {
          ref: (ref) => {
            this.children[index] = ref;
          }
        })
      }));
  }
}