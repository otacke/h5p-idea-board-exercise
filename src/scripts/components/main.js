import Board from '@components/board/board.js';
import ResizableArea from '@components/resizable-area/resizable-area.js';
import NavigationBar from '@components/navigation-bar/navigation-bar.js';
import SlideablePages from './slideable-pages/slideable-pages.js';
import Summary from '@components/summary/summary.js';
import Boards from '@models/boards.js';
import Screenreader from '@services/screenreader.js';
import { extend } from '@services/util.js';

import './main.scss';

export default class Main {

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
      onCompleted: () => {}
    }, callbacks);

    this.params.globals.set('read', (text) => {
      Screenreader.read(text);
    });

    this.isShowingSummary = this.params.previousState.isShowingSummary;
    this.wereAllBoardsCompleted = this.params.previousState.wereAllBoardsCompleted;
    this.completedBoardIndices = new Set(this.params.previousState.completedBoardIndices);

    this.navigationBar = new NavigationBar(
      {
        dictionary: this.params.dictionary,
      },
      {
        onClickButtonLeft: () => {
          this.goBackward();
        },
        onClickButtonRight: () => {
          this.goForward();
        }
      }
    );

    const boardInstances = this.params.boards.map((boardParams, index) => {
      return new Board(
        {
          dictionary: params.dictionary,
          globals: params.globals,
          boardParams: boardParams
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

  getDOM() {
    return this.dom;
  }

  goBackward() {
    if (this.isShowingSummary) {
      this.exitSummary();
    }
    else {
      this.showPreviousPage();
    }
  }

  exitSummary() {
    this.resizableArea.toggleVisibility(true);
    this.summary?.toggleVisibility(false);
    this.isShowingSummary = false;
    this.updateNavigationBar();
    this.params.globals.get('resize')();
  }

  showPreviousPage() {
    this.pages.swipeLeft();
    this.resizableArea.setPane2(this.boards.getTaskDescriptionDOM(this.pages.getCurrentPageIndex()));
  }

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

  enterSummary() {
    this.resizableArea.toggleVisibility(false);
    this.summary?.toggleVisibility(true);
    this.params.globals.get('resize')();
    this.isShowingSummary = true;
    this.updateNavigationBar();
  }

  showNextPage(currentPageIndex, nextPageIndex) {
    const nextPage = this.pages.getPageAtIndex(nextPageIndex);
    const nextBoard = this.boards.getBoard(nextPageIndex);

    if (nextPage && !nextPage.hasBeenVisible() && nextBoard?.shouldUsePreviousBoardContents()) {
      this.cloneBoardFromTo(currentPageIndex, nextPageIndex);
    }

    this.pages.swipeRight();
    this.resizableArea.setPane2(this.boards.getTaskDescriptionDOM(this.pages.getCurrentPageIndex()));
  }

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

  getScore() {
    return this.boards.getTotalScore();
  }

  getMaxScore() {
    return this.boards.getTotalMaxScore();
  }

  getAnswerGiven() {
    return this.boards.getAnswerGiven();
  }

  getCurrentState() {
    return {
      currentPageIndex: this.pages.getCurrentPageIndex(),
      isShowingSummary: this.isShowingSummary,
      wereAllBoardsCompleted: this.wereAllBoardsCompleted,
      completedBoardIndices: Array.from(this.completedBoardIndices),
      pages: this.pages.getCurrentState(),
    };
  }

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
}
