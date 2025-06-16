import ResizerHandle from './resizer-handle.js';
import './resizable-area.scss';

/** constant {number} MIN_VALUE Minimum value for the resizable area */
const MIN_VALUE = 0;

/** constant {number} MAX_VALUE Maximum value for the resizable area */
const MAX_VALUE = 100;

/** constant {number} DEFAULT_VALUE Default value for the resizable area */
const DEFAULT_VALUE = 50;

export default class ResizableArea {
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
        }
      }
    );

    const { dom, pane1, pane2 } = this.buildDOM({ uuid1, uuid2 });
    this.dom = dom;
    this.pane1 = pane1;
    this.pane2 = pane2;

    this.setPosition(this.position);
  }

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

  setPane1(dom) {
    this.pane1.innerHTML = '';
    this.pane1.appendChild(dom);
  }

  setPane2(dom) {
    this.pane2.innerHTML = '';
    this.pane2.appendChild(dom);
  }

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
}
