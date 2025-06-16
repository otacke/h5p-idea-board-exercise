import Board from '@components/board/board.js';
import ResizableArea from '@components/resizable-area/resizable-area.js';
import NavigationBar from '@components/navigation-bar/navigation-bar.js';
import SlideablePages from './slideable-pages/slideable-pages.js';
import Summary from '@components/summary/summary.js';
import Boards from '@models/boards.js';
import Screenreader from '@services/screenreader.js';
import { extend } from '@services/util.js';

import './main.scss';

/** @constant {number} FULL_SCREEN_DELAY_LARGE_MS Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY_LARGE_MS = 300;

export default class Main {

  /**
   * @class
   * @param {object} params Parameters for the main component.
   * @param {object} callbacks Callbacks for events.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      previousState: {
        currentPageIndex: 0,
        isShowingSummary: false,
        wereAllBoardsCompleted: false,
        completedBoardIndices: []
      },
    }, params);

    this.callbacks = extend({
      onProgressed: () => {},
      onCompleted: () => {},
      onClickButtonFullscreen: () => {}
    }, callbacks);

    this.params.globals.set('read', (text) => {
      Screenreader.read(text);
    });

    this.isShowingSummary = this.params.previousState.isShowingSummary;
    this.wereAllBoardsCompleted = this.params.previousState.wereAllBoardsCompleted;
    this.completedBoardIndices = new Set(this.params.previousState.completedBoardIndices);

    this.navigationBar = new NavigationBar(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      },
      {
        onClickButtonLeft: () => {
          this.goBackward();
        },
        onClickButtonRight: () => {
          this.goForward();
        },
        onClickButtonFullscreen: () => {
          this.callbacks.onClickButtonFullscreen();
        }
      }
    );

    const boardInstances = this.params.boards.map((boardParams, index) => {
      return new Board(
        {
          dictionary: params.dictionary,
          globals: params.globals,
          boardParams: boardParams,
          previousState: this.params.previousState.boards?.[index]
        },
        {
          onCompleted: () => {
            this.handleBoardCompleted(index);
          }
        }
      );
    });

    this.boards = new Boards(
      {
        globals: params.globals,
        boards: boardInstances
      }
    );

    this.pages = new SlideablePages(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        boardDOMs: this.boards.getBoardDOMs(),
        previousState: this.params.previousState.pages,
      },
      {
        onProgressed: (pageIndex) => {
          this.callbacks.onProgressed(pageIndex);
        },
        onTransitionEnded: () => {
          window.setTimeout(() => {
            this.pages.toggleSlideEffect(true);
          }, 0);
          this.updateNavigationBar();
        },
        getBoard: (pageIndex) => {
          return this.boards.getBoard(pageIndex);
        }
      }
    );

    this.resizableArea = new ResizableArea({
      dictionary: params.dictionary,
      globals: params.globals,
      minValue: 20,
      position: 70,
    });

    this.resizableArea.setPane1(this.pages.getDOM());

    if (params.summary) {
      this.summary = new Summary({
        contentParams: params.summary,
        globals: params.globals,
      });
      this.summary.toggleVisibility(false);
    }

    this.dom = this.buildDOM();

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    if (this.isShowingSummary) {
      this.pages.goTo(this.params.previousState.currentPageIndex);
      this.enterSummary();
    }
    else {
      this.pages.toggleSlideEffect(false); // No slide effect on initial load
      for (let i = 0; i < 1 + this.params.previousState.currentPageIndex; i++) {
        this.goForward();
      }
    }
  }

  /**
   * Get the main DOM element.
   * @returns {HTMLElement} Main DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Go backward in the navigation.
   */
  goBackward() {
    if (this.isShowingSummary) {
      this.exitSummary();
    }
    else {
      this.showPreviousPage();
    }
  }

  /**
   * Exit the summary view.
   */
  exitSummary() {
    this.resizableArea.toggleVisibility(true);
    this.summary?.toggleVisibility(false);
    this.isShowingSummary = false;
    this.updateNavigationBar();
    this.params.globals.get('resize')();
  }

  /**
   * Show the previous page.
   */
  showPreviousPage() {
    this.pages.swipeLeft();
    this.resizableArea.setPane2(this.boards.getTaskDescriptionDOM(this.pages.getCurrentPageIndex()));
  }

  /**
   * Go forward.
   */
  goForward() {
    const currentPageIndex = this.pages.getCurrentPageIndex();
    const nextPageIndex = currentPageIndex + 1;

    if (nextPageIndex >= this.pages.getLength()) {
      this.enterSummary();
    }
    else {
      this.showNextPage(currentPageIndex, nextPageIndex);
    }
  }

  /**
   * Enter the summary view.
   */
  enterSummary() {
    this.resizableArea.toggleVisibility(false);
    this.summary?.toggleVisibility(true);
    this.params.globals.get('resize')();
    this.isShowingSummary = true;
    this.updateNavigationBar();
  }

  /**
   * Show the next page.
   * @param {number} currentPageIndex Index of the current page.
   * @param {number} nextPageIndex Index of the next page.
   */
  showNextPage(currentPageIndex, nextPageIndex) {
    const nextPage = this.pages.getPageAtIndex(nextPageIndex);
    const nextBoard = this.boards.getBoard(nextPageIndex);

    if (nextPage && !nextPage.hasBeenVisible() && nextBoard?.shouldUsePreviousBoardContents()) {
      this.cloneBoardFromTo(currentPageIndex, nextPageIndex);
    }

    this.pages.swipeRight();
    this.resizableArea.setPane2(this.boards.getTaskDescriptionDOM(this.pages.getCurrentPageIndex()));
  }

  /**
   * Clone board contents of "from index" to board "to index".
   * @param {number} fromIndex Index of the board to clone from.
   * @param {number} toIndex Index of the board to clone to.
   */
  cloneBoardFromTo(fromIndex, toIndex) {
    const fromBoard = this.boards.getBoard(fromIndex);
    const toBoard = this.boards.getBoard(toIndex);

    if (!fromBoard || !toBoard) {
      return; // Invalid indices
    }

    const fromBoardPreviousState = fromBoard.getCurrentState();
    // Override UUIDs for cloned elements
    fromBoardPreviousState.main.elements = fromBoardPreviousState.main.elements.map((element) => {
      element.id = H5P.createUUID();
      element.contentType.subContentId = H5P.createUUID();
      return element;
    });

    toBoard.rebuildInstance(fromBoardPreviousState);
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-idea-board-exercise-main');

    const mainArea = document.createElement('div');
    mainArea.classList.add('h5p-idea-board-exercise-main-area');

    if (this.summary) {
      mainArea.append(this.summary.getDOM());
    }
    mainArea.appendChild(this.resizableArea.getDOM());

    dom.append(mainArea);

    dom.append(this.navigationBar.getDOM());

    return dom;
  }

  /**
   * Update the navigation bar based on the current state.
   */
  updateNavigationBar() {
    const currentPageIndex = this.pages.getCurrentPageIndex();

    const left = currentPageIndex > 0;

    const currentBoardWasCompleted = this.completedBoardIndices.has(currentPageIndex);

    const hasMorePages = this.summary ?
      currentPageIndex < this.pages.getLength() :
      currentPageIndex < this.pages.getLength() - 1;

    const right = currentBoardWasCompleted && !this.isShowingSummary && hasMorePages;

    this.navigationBar.update({ left: left, right: right });
  }

  /**
   * Handle when a board is completed.
   * @param {number} index Index of the completed board.
   */
  handleBoardCompleted(index) {
    this.completedBoardIndices.add(index);
    this.updateNavigationBar();

    if (this.wereAllBoardsCompleted) {
      return; // Already completed, no need to check again
    }

    if (this.completedBoardIndices.size === this.boards.getBoardDOMs().length) {
      this.wereAllBoardsCompleted = true;
      this.callbacks.onCompleted();
    }
  }

  /**
   * Get the current score of all boards.
   * @returns {number} Total score.
   */
  getScore() {
    return this.boards.getTotalScore();
  }

  /**
   * Get the maximum score of all boards.
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    return this.boards.getTotalMaxScore();
  }

  /**
   * Get whether the user has given an answer.
   * @returns {boolean} True if the user has given an answer, false otherwise.
   */
  getAnswerGiven() {
    return this.boards.getAnswerGiven();
  }

  /**
   * Get the current state of the main component.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      currentPageIndex: this.pages.getCurrentPageIndex(),
      isShowingSummary: this.isShowingSummary,
      wereAllBoardsCompleted: this.wereAllBoardsCompleted,
      completedBoardIndices: Array.from(this.completedBoardIndices),
      pages: this.pages.getCurrentState(),
      boards: this.boards.getCurrentState()
    };
  }

  /**
   * Reset the main component.
   */
  reset() {
    if (this.isShowingSummary) {
      this.exitSummary();
    }

    this.boards.reset();
    this.pages.reset();
    this.resizableArea.setPane2(this.boards.getTaskDescriptionDOM(this.pages.getCurrentPageIndex()));
  }

  /**
   * Get xAPI data for children.
   * @returns {object[]} XAPI data for children.
   */
  getXAPIData() {
    return this.boards.getXAPIData();
  }

  /**
   * Toggle fullscreen mode.
   * @param {boolean} shouldBeFullscreen True to enter fullscreen, false to exit.
   */
  toggleFullscreen(shouldBeFullscreen) {
    this.navigationBar.toggleFullscreen(shouldBeFullscreen);

    if (shouldBeFullscreen) {
      window.setTimeout(() => {
        const availableHeight = window.innerHeight - this.navigationBar.getHeight();
        this.dom.style.setProperty('--h5p-idea-board-exercise-main-max-height', `${availableHeight}px`);

        const availableWidth = availableHeight * this.pages.getAspectRatio();
        this.dom.style.setProperty('--h5p-idea-board-exercise-main-max-width', `${availableWidth}px`);
      }, FULL_SCREEN_DELAY_LARGE_MS); // Some devices don't register user gesture before call to to requestFullscreen
    }
    else {
      this.dom.style.removeProperty('--h5p-idea-board-exercise-main-max-height');
      this.dom.style.removeProperty('--h5p-idea-board-exercise-main-max-width');
    }
  }
}
