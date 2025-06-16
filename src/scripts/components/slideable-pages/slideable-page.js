import './slideable-page.scss';

export default class SlideablePage {
  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.nextTransitionId = 0;
    this.transitionCallbacks = {};

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-slideable-page');
    this.setPosition(1); // 1 = Future to allow initial slide in from right

    this.dom.append(params.dom);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update page.
   * @param {object} [params] Parameters.
   */
  update(params = {}) {
    if (typeof params.visible === 'boolean') {
      this.dom.classList.toggle('display-none', !params.visible);
    }
  }

  /**
   * Register callback to call once the next transition has ended.
   * @param {function} callback Callback when transition has ended.
   */
  registerTransitionEnd(callback) {
    if (typeof callback !== 'function') {
      return; // No valid callback
    }

    this.dom.addEventListener('transitionend', callback, { once: true });
  }

  /**
   * Set position.
   * @param {number} position negative = past, 0 = present, positive = future.
   */
  setPosition(position) {
    this.dom.classList.toggle('past', position < 0);
    this.dom.classList.toggle('present', position === 0);
    this.dom.classList.toggle('future', position > 0);

    if (position === 0) {
      this.hasBeenVisibleState = true;
    }
  }

  hasBeenVisible() {
    return this.hasBeenVisibleState;
  }

  getCurrentState() {
    return {
      hasBeenVisible: this.hasBeenVisible()
    };
  }

  reset() {
    this.hasBeenVisibleState = false;
  }
}
