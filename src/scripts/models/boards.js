export default class Boards {
  constructor(params = {}) {
    this.boards = params.boards;
  }

  getBoardDOMs() {
    return this.boards.map((board) => board.getDOM());
  }

  getBoard(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.boards.length) {
      return null;
    }

    return this.boards[index];
  }

  getBoardDOM(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.boards.length) {
      return null;
    }

    const board = this.boards[index];
    return board.getDOM();
  }

  /**
   * Get the aspect ratio of a board.
   * @param {number} index Index of the board.
   * @returns {number|null} Aspect ratio (width / height) or null if not found.
   */
  getAspectRatio(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.boards.length) {
      return null;
    }

    const board = this.boards[index];
    return board.getAspectRatio();
  }

  getTaskDescription(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.boards.length) {
      return null;
    }

    const board = this.boards[index];
    return board.getTaskDescription();
  }

  isCompleted(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.boards.length) {
      return false;
    }

    const board = this.boards[index];
    return board.isCompleted();
  }

  getTotalScore() {
    return this.boards.reduce((total, board) => {
      return total + board.getScore();
    }, 0);
  }

  getTotalMaxScore() {
    return this.boards.reduce((total, board) => {
      return total + board.getMaxScore();
    }, 0);
  }

  getAnswerGiven() {
    return this.boards.some((board) => board.getAnswerGiven());
  }

  reset() {
    this.boards.forEach((board) => {
      board.reset();
    });
  }

  /**
   * Get xAPI data from boards.
   * @returns {object[]} XAPI data for children.
   */
  getXAPIData() {
    return this.boards.map((board) => board.getXAPIData());
  }

  /**
   * Get current state of all boards.
   * @returns {object[]} Current state of each board.
   */
  getCurrentState() {
    return this.boards.map((board) => board.getCurrentState());
  }
}
