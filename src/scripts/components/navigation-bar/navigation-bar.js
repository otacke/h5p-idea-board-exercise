import Button from './button.js';
import { extend } from '@services/util.js';
import './navigation-bar.scss';

export default class NavigationBar {

  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);

    this.callbacks = extend({
      onClickButtonLeft: () => {},
      onClickButtonRight: () => {}
    }, callbacks);

    this.buttons = {};

    const { dom, buttonLeft, buttonRight } = this.buildDOM();
    this.dom = dom;
    this.buttons.left = buttonLeft;
    this.buttons.right = buttonRight;

    this.setButtonTabbable('left');
  }

  getDOM() {
    return this.dom;
  }

  buildDOM() {
    const dom = document.createElement('nav');
    dom.classList.add('h5p-idea-board-navigation-bar');
    dom.setAttribute('role', 'toolbar');
    dom.setAttribute('aria-label', this.params.dictionary.get('a11y.navigationBar'));

    dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    const buttonLeft = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.previousContent'),
          disabled: this.params.dictionary.get('a11y.previousContentDisabled'),
        },
        classes: [
          'h5p-idea-board-button',
          'h5p-idea-board-button-left'
        ],
        disabled: true,
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonLeft();
        }
      }
    );
    dom.appendChild(buttonLeft.getDOM());

    const buttonRight = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.nextContent'),
          disabled: this.params.dictionary.get('a11y.nextContentDisabled'),
        },
        classes: [
          'h5p-idea-board-button',
          'h5p-idea-board-button-right'
        ],
        disabled: true,
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonRight();
        }
      }
    );
    dom.appendChild(buttonRight.getDOM());

    return { dom, buttonLeft, buttonRight };
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      if (
        this.currentTabbableButton === 'right') {
        this.setButtonTabbable('left');
      }
      else {
        this.setButtonTabbable('right');
      }
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      if (this.currentTabbableButton === 'left') {
        this.setButtonTabbable('right');
      }
      else {
        this.setButtonTabbable('left');
      }
    }
    else if (event.code === 'Home') {
      this.setButtonTabbable('left');
    }
    else if (event.code === 'End') {
      this.setButtonTabbable('right');
    }
    else {
      return;
    }

    event.preventDefault();
  }

  /**
   * Set button tabbable.
   * @param {string} name Name of the button.
   */
  setButtonTabbable(name) {
    this.currentTabbableButton = name;

    for (let key in this.buttons) {
      if (key === name) {
        this.buttons[key]?.setTabbable(true);
        this.buttons[key]?.focus();
      }
      else {
        this.buttons[key]?.setTabbable(false);
      }
    }
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  update(params = {}) {
    if (typeof params.left === 'boolean') {
      if (params.left) {
        this.enableButton('left');
      }
      else {
        this.disableButton('left');
      }
    }

    if (typeof params.right === 'boolean') {
      if (params.right) {
        this.enableButton('right');
      }
      else {
        this.disableButton('right');
      }
    }
  }
}
