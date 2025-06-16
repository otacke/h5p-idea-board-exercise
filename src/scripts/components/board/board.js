import { callOnceVisible, extend } from '@services/util.js';

export default class Board {

  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.callbacks = extend({
      onCompleted: () => {}
    }, callbacks);

    this.score = 0;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-board-instance');

    this.taskDescriptionDOM = document.createElement('div');
    this.taskDescriptionDOM.classList.add('h5p-idea-board-exercise-task-description');
    this.taskDescriptionDOM.innerHTML = this.params.boardParams.taskDescription ?? '';

    this.buildInstance();
    this.attachInstance();
  }

  /**
   * Get the score of the board.
   * @returns {number} Score of the board.
   */
  getScore() {
    return this.score;
  }

  /**
   * Get the maximum score of the board.
   * @returns {number} Maximum score of the board.
   */
  getMaxScore() {
    return this.params.boardParams.scoreForCompletion || 0;
  }

  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() || false;
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }

  buildInstance(previousState = {}) {
    this.instance = H5P.newRunnable(
      this.params.boardParams.boardGroup.ideaBoard,
      this.params.globals.get('contentId'),
      undefined,
      true,
      { previousState }
    );

    if (!this.instance) {
      throw new Error('Failed to create board instance');
    }

    const boardParams = this.params.boardParams;

    this.requiresCompletion = boardParams.requiresCompletionToProgress &&
      (
        boardParams.completionRules?.numberTextFieldsCreated > 0 ||
        boardParams.completionRules?.numberTextFieldsEdited > 0
      );

    this.completed = new Set();
    if (this.requiresCompletion) {
      this.trackCompletionEvents(this.instance);
    }

    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );

    callOnceVisible(this.dom, () => {
      this.checkCompletion();
    });
  }

  getDOM() {
    return this.dom;
  }

  getTaskDescriptionDOM() {
    return this.taskDescriptionDOM;
  }

  getCurrentState() {
    return this.instance.getCurrentStateWhenNoAnswerGiven();
  }

  rebuildInstance(previousState = {}) {
    delete this.instance;
    this.isAttached = false;
    this.buildInstance(previousState);
    this.attachInstance();
  }

  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.dom.innerHTML = ''; // Clear previous content
    this.instance.attach(H5P.jQuery(this.dom));
    this.isAttached = true;

    this.params.globals.get('resize')();
  }

  /**
   * Find first focusable element and set focus.
   * @returns {boolean} True if could focus on first child, else false.
   */
  focusFirstChild() {
    const firstFocusableChild = this.getFirstFocusableChild();
    if (!firstFocusableChild) {
      return false; // No focusable child found.
    }

    firstFocusableChild.focus();

    return true;
  }

  getFirstFocusableChild() {
    const focusableElementsString = [
      '.h5p-idea-board-element-interactor'
    ].join(', ');

    return [...this.dom.querySelectorAll(focusableElementsString)]
      .filter((element) => {
        const disabled = element.getAttribute('disabled');
        return disabled !== 'true' && disabled !== true;
      })
      .shift();
  }

  trackCompletionEvents(instance) {
    ['edited', 'added'].forEach((eventName) => {
      instance.on(eventName, (event) => {
        const data = event.data;

        this.completed.add({
          type: eventName,
          subContentId: data.subContentId,
          machineName: data.machineName
        });

        this.checkCompletion();
      });
    });
  }

  checkCompletion() {
    if (this.isCompleted()) {
      this.score = this.params.boardParams.scoreForCompletion;
      this.callbacks.onCompleted();
    }
  }

  isCompleted() {
    if (!this.requiresCompletion) {
      return true;
    }

    const numberTextFieldsCreated = Array.from(this.completed)
      .filter((item) => item.type === 'added').length;

    if (numberTextFieldsCreated < this.params.boardParams.completionRules?.numberTextFieldsCreated) {
      return false;
    }
    const numberTextFieldsEdited = Array.from(this.completed)
      .filter((item) => item.type === 'edited').length;

    if (numberTextFieldsEdited < this.params.boardParams.completionRules?.numberTextFieldsEdited) {
      return false;
    }

    return true;
  }

  /**
   * Get content title.
   * @returns {string} Content title.
   */
  getTitle() {
    if (this.instance?.getTitle) {
      return this.instance.getTitle();
    }

    return this.params.boardParams.boardGroup.ideaBoard.metadata?.title || this.params.dictionary.get('l10n.noTitle');
  }

  shouldUsePreviousBoardContents() {
    return !!this.params.boardParams.usePreviousBoardContents;
  }

  reset() {
    this.score = 0;
    this.instance?.resetTask?.();
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI data.
   */
  getXAPIData() {
    return this.instance.getXAPIData();
  }
}
