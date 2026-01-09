import ResizerHandle from './resizer-handle.js';
import './resizable-area.scss';

/** constant {number} MIN_VALUE Minimum value for the resizable area */
const MIN_VALUE = 0;

/** constant {number} MAX_VALUE Maximum value for the resizable area */
const MAX_VALUE = 100;

/** constant {number} DEFAULT_VALUE Default value for the resizable area */
const DEFAULT_VALUE = 50;

export default class ResizableArea {

  /**
   * @class
   * @param {object} [params] Parameters for the resizable area.
   * @param {object} [params.globals] Global parameters.
   * @param {number} [params.minValue] Minimum value for the resizable area (default: 0).
   * @param {number} [params.maxValue] Maximum value for the resizable area (default: 100).
   * @param {number} [params.position] Initial position of the resizable area (default: 50).
   * @param {boolean} [params.isCollapsed] Whether the resizable area is collapsed (default: false).
   * @param {number} [params.positionBeforeCollapsed] Position before the resizable area was collapsed (default: 50).
   */
  constructor(params = {}) {
    this.globals = params.globals;

    this.minValue = Math.max(params.minValue ?? MIN_VALUE, MIN_VALUE);
    this.maxValue = Math.min(params.maxValue ?? MAX_VALUE, MAX_VALUE);
    this.position = Math.max(this.minValue, Math.min(params.position ?? DEFAULT_VALUE, this.maxValue));

    const uuid1 = H5P.createUUID();
    const uuid2 = H5P.createUUID();

    this.resizer = new ResizerHandle(
      {
        uuid1: uuid1,
        uuid2: uuid2,
      },
      {
        onStarted: () => {
          this.dom.classList.add('is-resizing');
        },
        onResized: (params) => {
          const rect = this.dom.getBoundingClientRect();

          let percent;
          if (typeof params.position === 'number') {
            const pointerX = params.position - rect.left;
            percent = (pointerX / rect.width) * 100;
          }
          else if (typeof params.delta === 'number') {
            percent = this.position + params.delta;
          }
          else if (typeof params.toggle) {
            percent = (this.isCollapsed) ? this.positionBeforeCollapsed : this.minValue;
          }
          else {
            return;
          }

          this.setPosition(percent);
        },
        onEnded: () => {
          this.dom.classList.remove('is-resizing');
        },
      },
    );

    const { dom, pane1, pane2 } = this.buildDOM({ uuid1, uuid2 });
    this.dom = dom;
    this.pane1 = pane1;
    this.pane2 = pane2;

    this.setPosition(this.position);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Resizable area DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build resizable area DOM.
   * @param {object} [params] Parameters for the resizable area.
   * @returns {HTMLElement} Resizable area DOM.
   */
  buildDOM(params) {
    const dom = document.createElement('div');
    dom.classList.add('h5p-idea-board-exercise-resizable-area');

    const pane1 = document.createElement('div');
    pane1.setAttribute('id', params.uuid1);
    pane1.classList.add('pane');
    pane1.classList.add('first');
    dom.appendChild(pane1);

    dom.appendChild(this.resizer.getDOM());

    const pane2 = document.createElement('div');
    pane2.setAttribute('id', params.uuid2);
    pane2.classList.add('pane');
    pane2.classList.add('second');
    dom.appendChild(pane2);

    return { dom, pane1, pane2 };
  }

  /**
   * Set position of the resizable area.
   * @param {number} position Position to set (in percentage).
   */
  setPosition(position) {
    const oldPosition = this.position;

    this.position = Math.max(this.minValue, Math.min(position, this.maxValue));

    this.isCollapsed = this.position === this.minValue;
    if (this.isCollapsed) {
      this.positionBeforeCollapsed = oldPosition;
    }

    this.dom.style.setProperty('--resizer-position', `${this.position}%`);
    this.resizer.setPosition(this.position);

    this.globals.get('resize')();
  }

  /**
   * Set fixed width for the panes.
   * @param {number} widthPane1 Fixed width for pane 1.
   * @param {number} widthPane2 Fixed width for pane 2.
   */
  setFixedWidth(widthPane1, widthPane2) {
    if (typeof widthPane1 !== 'number' || typeof widthPane2 !== 'number') {
      this.pane1.style.setProperty('--fixed-width', '');
      this.pane2.style.setProperty('--fixed-width', '');
      this.resizer.show();
    }
    else {
      this.pane1.style.setProperty('--fixed-width', `${widthPane1}px`);
      this.pane2.style.setProperty('--fixed-width', `${widthPane2}px`);
      this.resizer.hide();
    }
  }

  /**
   * Set content for pane 1.
   * @param {HTMLElement} dom Content to set in pane 1.
   */
  setPane1(dom) {
    this.pane1.innerHTML = '';
    this.pane1.appendChild(dom);
  }

  /**
   * Set content for pane 2.
   * @param {HTMLElement} dom Content to set in pane 2.
   */
  setPane2(dom) {
    this.pane2.innerHTML = '';
    this.pane2.appendChild(dom);
  }

  /**
   * Toggle visibility of the resizable area.
   * @param {boolean} visible Whether the resizable area should be visible.
   */
  toggleVisibility(visible) {
    this.dom.classList.toggle('display-none', !visible);
    if (!visible) {
      this.dom.classList.add('opacity-0');
    }
    else {
      window.requestAnimationFrame(() => {
        this.dom.classList.remove('opacity-0');
      });
    };
  }

  /**
   * Get the current flex direction of the resizable area.
   * @returns {string} Current flex direction: `row` or `column`.
   */
  getFlexDirection() {
    return window.getComputedStyle(this.dom).getPropertyValue('flex-direction') ?? 'row';
  }

  /**
   * Get the height of a specific pane.
   * @param {number} index Index of the pane (1 or 2).
   * @returns {number} Height of the specified pane in pixels.
   */
  getPaneHeight(index) {
    if (index === 0) {
      return this.pane1.offsetHeight;
    }
    else if (index === 1) {
      return this.pane2.offsetHeight;
    }
    return 0; // Invalid index
  }
}
