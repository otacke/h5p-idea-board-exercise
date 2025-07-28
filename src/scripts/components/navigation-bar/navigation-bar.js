import Button from './button.js';
import { extend } from '@services/util.js';
import './navigation-bar.scss';

export default class NavigationBar {

  /**
   * @class
   * @param {object} [params] Parameters for the navigation bar.
   * @param {object} [params.dictionary] Dictionary for localization.
   * @param {object} [callbacks] Callbacks for events.
   * @param {function} [callbacks.onClickButtonLeft] Callback for click on left button.
   * @param {function} [callbacks.onClickButtonRight] Callback for click on right button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);

    this.callbacks = extend({
      onClickButtonLeft: () => {},
      onClickButtonRight: () => {},
      onClickButtonClonePreviousSlide: () => {},
      onClickButtonFullscreen: () => {}
    }, callbacks);

    this.buttons = {};

    const { dom, buttons } = this.buildDOM();
    this.dom = dom;
    this.buttons.left = buttons.left;
    this.buttons.right = buttons.right;
    if (buttons.clonePreviousSlide) {
      this.buttons.clonePreviousSlide = buttons.clonePreviousSlide;
    }
    if (buttons.fullscreen) {
      this.buttons.fullscreen = buttons.fullscreen;
    }

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
  }

  /**
   * Get the DOM element of the navigation bar.
   * @returns {HTMLElement} The DOM element of the navigation bar.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the DOM for the navigation bar.
   * @returns {object} Object containing the DOM and buttons.
   */
  buildDOM() {
    const buttons = {};

    const dom = document.createElement('nav');
    dom.classList.add('h5p-idea-board-navigation-bar');
    dom.setAttribute('role', 'toolbar');
    dom.setAttribute('aria-label', this.params.dictionary.get('a11y.navigationBar'));

    dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    const buttonsContainerLeft = document.createElement('div');
    buttonsContainerLeft.classList.add('h5p-idea-board-navigation-bar-buttons-container-left');
    dom.append(buttonsContainerLeft);

    const buttonsContainerRight = document.createElement('div');
    buttonsContainerRight.classList.add('h5p-idea-board-navigation-bar-buttons-container-right');
    dom.append(buttonsContainerRight);

    buttons.left = new Button(
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
    buttonsContainerLeft.append(buttons.left.getDOM());

    buttons.right = new Button(
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
    buttonsContainerLeft.append(buttons.right.getDOM());

    if (this.params.globals.get('someCanClonePreviousSlide')) {
      buttons.clonePreviousSlide = new Button({
        id: 'clone-previous-slide',
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.clonePreviousSlide'),
          disabled: this.params.dictionary.get('a11y.clonePreviousSlideDisabled'),
        },
        classes: [
          'h5p-idea-board-button',
          'h5p-idea-board-button-clone-previous'
        ]
      }, {
        onClick: () => {
          this.callbacks.onClickButtonClonePreviousSlide();
        }
      });

      buttonsContainerRight.append(buttons.clonePreviousSlide.getDOM());
    }

    if (this.params.globals.get('isFullscreenSupported')) {
      buttons.fullscreen = new Button(
        {
          id: 'fullscreen',
          type: 'pulse',
          a11y: {
            active: this.params.dictionary.get('a11y.exitFullscreen'),
            inactive: this.params.dictionary.get('a11y.enterFullscreen'),
            disabled: this.params.dictionary.get('a11y.fullScreenDisabled'),
          },
          classes: [
            'h5p-idea-board-button',
            'h5p-idea-board-button-fullscreen',
            'enter-fullscreen'
          ]
        },
        {
          onClick: () => {
            this.callbacks.onClickButtonFullscreen();
          }
        }
      );

      buttonsContainerRight.append(buttons.fullscreen.getDOM());
    }

    return { dom, buttons };
  }

  /**
   * Toggle fullscreen state.
   * @param {boolean} [state] True to enter fullscreen, false to exit fullscreen.
   */
  toggleFullscreen(state) {
    if (!this.buttons.fullscreen) {
      return; // Fullscreen button not available
    }

    this.buttons.fullscreen.toggleClass('enter-fullscreen', state !== true);
    this.buttons.fullscreen.toggleClass('exit-fullscreen', state === true);
  }

  /**
   * Get the width of the navigation bar.
   * @returns {number} Width of the navigation bar.
   */
  getHeight() {
    return this.dom.offsetHeight;
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex
      );
    }
    else {
      return;
    }
    event.preventDefault();
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }

    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }

    Object.values(this.buttons)[this.currentButtonIndex].setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
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

  /**
   * Update the navigation bar.
   * @param {object} [params] Parameters to update the navigation bar.
   * @param {boolean} [params.left] If true, enable the left button, else disable it.
   * @param {boolean} [params.right] If true, enable the right button, else disable it.
   */
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
