import { extend } from '@services/util.js';
import './resizer-handle.scss';

const MIN_VALUE = 0;
const MAX_VALUE = 100;

export default class ResizerHandle {

  /**
   * @class
   * @param {object} [params] Parameters for the resizer handle.
   * @param {string} [params.uuid1] UUID of the first element to resize.
   * @param {string} [params.uuid2] UUID of the second element to resize.
   * @param {object} [callbacks] Callbacks for events.
   * @param {function} [callbacks.onStarted] Callback when resizing starts.
   * @param {function} [callbacks.onResized] Callback when resizing occurs.
   * @param {function} [callbacks.onEnded] Callback when resizing ends.
   */
  constructor(params = {}, callbacks = {}) {
    this.callbacks = extend({
      onStarted: () => {},
      onResized: () => {},
      onEnded: () => {}
    }, callbacks);

    this.isResizing = false;

    this.dom = this.buildDOM({ uuid1: params.uuid1, uuid2: params.uuid2 });
  }

  /**
   * Get the DOM element of the resizer handle.
   * @returns {HTMLElement} The DOM element of the resizer handle.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build resizer handle DOM.
   * @param {object} [params] Parameters for the resizer handle.
   * @returns {HTMLElement} Resizer handle DOM.
   */
  buildDOM(params = {}) {
    const handleId = H5P.createUUID();

    const dom = document.createElement('div');
    dom.classList.add('h5p-idea-board-exercise-resizer');
    dom.setAttribute('id', handleId);
    // Pattern requests separator role, but that is not handles well by all screen readers
    dom.setAttribute('role', 'slider');
    dom.setAttribute('aria-label', 'Resize the area for the board and task description');
    dom.setAttribute('aria-valuemin', `${MIN_VALUE}`);
    dom.setAttribute('aria-valuemax', `${MAX_VALUE}`);
    dom.setAttribute('aria-orientation', 'vertical');
    dom.setAttribute('tabindex', '0');
    dom.setAttribute('aria-controls', `${params.uuid1} ${params.uuid2}`);

    // Handle mouse/pointer events
    dom.addEventListener('pointerdown', (event) => {
      event.preventDefault(); // Prevent text selection
      this.isResizing = true;
      this.callbacks.onStarted();
    });

    // Handle touch events specifically
    dom.addEventListener('touchstart', (event) => {
      event.preventDefault(); // Prevent scrolling
      this.isResizing = true;
      this.callbacks.onStarted();
    });

    // Handle mouse/pointer movement
    document.addEventListener('pointermove', (event) => {
      if (!this.isResizing) {
        return;
      }

      this.callbacks.onResized({ position: event.clientX });
    });

    // Handle touch movement
    document.addEventListener('touchmove', (event) => {
      if (!this.isResizing) {
        return;
      }

      if (event.touches && event.touches[0]) {
        this.callbacks.onResized({ position: event.touches[0].clientX });
      }
    }, { passive: false });

    // Handle mouse/pointer release
    document.addEventListener('pointerup', () => {
      if (!this.isResizing) {
        return;
      }

      this.isResizing = false;
      this.callbacks.onEnded();
    });

    // Handle touch release
    document.addEventListener('touchend', () => {
      if (!this.isResizing) {
        return;
      }

      this.isResizing = false;
      this.callbacks.onEnded();
    });

    // Handle touch cancel
    document.addEventListener('touchcancel', () => {
      if (!this.isResizing) {
        return;
      }

      this.isResizing = false;
      this.callbacks.onEnded();
    });

    dom.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.callbacks.onResized({ delta: -1 });
      }
      else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.callbacks.onResized({ delta: 1 });
      }
      else if (event.key === 'Home') {
        event.preventDefault();
        const delta = MIN_VALUE - this.position;
        this.callbacks.onResized({ delta: delta });
      }
      else if (event.key === 'End') {
        event.preventDefault();
        const delta = MAX_VALUE - this.position;
        this.callbacks.onResized({ delta: delta });
      }
      else if (event.key === 'Enter') {
        event.preventDefault();
        this.callbacks.onResized({ toggle: true });
      }
    });

    const resizerBar = document.createElement('div');
    resizerBar.classList.add('h5p-idea-board-exercise-resizer-bar');

    dom.append(resizerBar);

    return dom;
  }

  /**
   * Set the position of the resizer handle.
   * @param {number} position Position to set, must be between MIN_VALUE and MAX_VALUE.
   */
  setPosition(position) {
    if (position < MIN_VALUE || position > MAX_VALUE) {
      return;
    }

    this.position = position;

    this.dom.setAttribute('aria-valuenow', this.position);
  }
}
