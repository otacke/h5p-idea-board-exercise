import SlideablePage from './slideable-page.js';
import { extend } from '@services/util.js';
import './slideable-pages.scss';
import { isUsingMouse } from '@services/util-h5p.js';

export default class SlideablePages {
  /**
   * @class
   * @param {object} params Parameters for the slideable pages.
   * @param {object[]} params.pages Array of page objects.
   * @param {object} [callbacks] Callbacks for events.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      previousState: {
        pages: new Array(params.boardDOMs.length).fill({})
      }
    }, params);

    this.callbacks = extend({
      onProgressed: () => {},
      onTransitionEnded: () => {},
      getBoard: () => {}
    }, callbacks);

    this.pages = params.boardDOMs.map((boardDOM, index) => {
      return new SlideablePage({
        dom: boardDOM,
        previousState: this.params.previousState.pages[index] ?? {}
      });
    });
    this.hasSlideEffect = true;

    this.currentPageIndex = -1;

    this.dom = this.buildDOM();
  }

  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-idea-board-exercise-slideable-pages');

    this.pages.forEach((page) => {
      dom.append(page.getDOM());
    });

    return dom;
  }

  getDOM() {
    return this.dom;
  }

  getPageAtIndex(index) {
    if (index < 0 || index >= this.pages.length) {
      return null; // Out of bounds
    }

    return this.pages[index];
  }

  /**
   * Get current page index.
   * @returns {number} Current page index.
   */
  getCurrentPageIndex() {
    return this.currentPageIndex;
  }

  getLength() {
    return this.pages.length;
  }

  toggleSlideEffect(shouldBeOn) {
    if (typeof shouldBeOn !== 'boolean') {
      shouldBeOn = !this.hasSlideEffect;
    }

    this.hasSlideEffect = shouldBeOn;
    if (this.hasSlideEffect) {
      this.dom.style.setProperty('--page-transition', 'left .35s');
    }
    else {
      this.dom.style.setProperty('--page-transition', 'none');
    }
  }

  goTo(to, options = {}) {
    if (to < 0 || to >= this.pages.length) {
      return; // Out of bounds
    }

    this.currentPageIndex = to;

    this.handleUpdatePagePositionsEnded({ skipFocus: options.skipFocus });

    // Make all pages from `from` up to `to` visible
    const visiblePages = [...Array(to + 1).keys()];

    this.pages.forEach((page, index) => {
      page.update({ visible: visiblePages.includes(index) });
    });

    this.params.globals.get('resize')();

    window.requestAnimationFrame(() => {
      this.pages.forEach((page, index) => {
        page.setPosition(index - this.currentPageIndex);
      });
    });

    this.callbacks.onProgressed(this.currentPageIndex);
  }

  /**
   * Swipe to page.
   * @param {number} [to] Page number to swipe to.
   * @param {object} [options] Options.
   * @param {boolean} [options.skipFocus] If true, skip focus after swiping.
   */
  swipeTo(to = -1, options = {}) {
    if (this.isSwiping && (to < 0 || to > this.getLength() - 1)) {
      return; // Swiping or out of bounds
    }

    to = (to + this.getLength()) % this.getLength();

    let from = this.currentPageIndex;
    if (from === to) {
      return; // Nothing to do.
    }

    this.isSwiping = true;

    this.currentPageIndex = to;

    // Ensure to > from
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    this.announceCurrentPage();

    if (this.hasSlideEffect) {
      this.pages[to].registerTransitionEnd(() => {
        this.handleUpdatePagePositionsEnded({ skipFocus: options.skipFocus });
      });
    }
    else {
      this.handleUpdatePagePositionsEnded({ skipFocus: options.skipFocus });
    }

    // Make all pages from `from` up to `to` visible
    const visiblePages = [...Array(to - from + 1).keys()]
      .map((x) => x + from);

    this.pages.forEach((page, index) => {
      page.update({ visible: visiblePages.includes(index) });
    });

    this.params.globals.get('resize')();

    // Let browser display and resize pages before starting transition
    window.requestAnimationFrame(() => {
      this.pages.forEach((page, index) => {
        page.setPosition(index - this.currentPageIndex);
      });
    });

    this.callbacks.onProgressed(this.currentPageIndex);
  }

  announceCurrentPage() {
    const instanceTitle = this.callbacks.getBoard(this.currentPageIndex).getTitle();

    let screenReaderText = this.params.dictionary.get('a11y.currentPage')
      .replace(/@current/g, this.currentPageIndex + 1)
      .replace(/@total/g, this.pages.length);
    screenReaderText = screenReaderText ? `${screenReaderText}. ${instanceTitle}` : instanceTitle;
    this.params.globals.get('read')(screenReaderText);
  }

  /**
   * Swipe content left.
   */
  swipeLeft() {
    if (this.isSwiping || this.currentPageIndex <= 0) {
      return; // Swiping or already at outer left
    }

    this.swipeTo(this.currentPageIndex - 1, { skipFocus: isUsingMouse() });
  }

  /**
   * Swipe content right.
   */
  swipeRight() {
    if (this.isSwiping || this.currentPageIndex === this.getLength() - 1) {
      return; // Swiping or already at outer right
    }

    this.swipeTo(this.currentPageIndex + 1, { skipFocus: isUsingMouse() });
  }

  /**
   * Handle updating page positions ended.
   * @param {object} [options] Options.
   */
  handleUpdatePagePositionsEnded(options = {}) {
    this.pages.forEach((page, index) => {
      if (index !== this.currentPageIndex) {
        page.getDOM().classList.add('display-none');
      }
      else if (!options.skipFocus) {
        const board = this.callbacks.getBoard(this.currentPageIndex);
        if (!board.focusFirstChild()) {
          // Re-announce current active element after moving page to make focus clear
          const currentFocusElement = document.activeElement;
          document.activeElement.blur();
          currentFocusElement.focus();
        }
      }
    });

    this.isSwiping = false;

    this.callbacks.onTransitionEnded();

    this.params.globals.get('resize')();
  }

  getCurrentState() {
    return {
      pages: this.pages.map((page) => page.getCurrentState())
    };
  }

  reset() {
    this.pages.forEach((page) => {
      page.reset();
    });
    this.swipeTo(0, { skipFocus: true });
  }
}
