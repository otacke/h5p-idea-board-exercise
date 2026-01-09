import { callOnceVisible, extend } from '@services/util.js';
import taskDescription from './task-description/task-description.js';
import './board.scss';

export default class Board {

  /**
   * @class
   * @param {object} [params] Parameters for the board.
   * @param {object} [params.boardParams] Parameters for the board.
   * @param {object} [params.globals] Global parameters and functions.
   * @param {object} [callbacks] Callbacks for events.
   * @param {function} [callbacks.onCompleted] Callback when the board is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.callbacks = extend({
      onCompleted: () => {},
    }, callbacks);

    this.score = 0;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-board-instance');

    this.taskDescription = new taskDescription({
      dictionary: this.params.dictionary,
      description: this.params.boardParams.taskDescription,
      completionRules: this.params.boardParams.completionRules,
    });

    this.buildInstance(this.params.previousState);
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

  /**
   * Check if the board has an answer given.
   * @returns {boolean} True if an answer has been given, else false.
   */
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

  /**
   * Build the board instance.
   * @param {object} [previousState] Previous state to restore.
   */
  buildInstance(previousState = {}) {
    this.instance = H5P.newRunnable(
      this.params.boardParams.boardGroup.ideaBoard,
      this.params.globals.get('contentId'),
      undefined,
      true,
      { previousState },
    );

    if (!this.instance) {
      throw new Error('Failed to create board instance');
    }

    const boardParams = this.params.boardParams;

    this.requiresCompletion = boardParams.requiresCompletionToProgress &&
      (
        boardParams.completionRules?.numberCardsCreated > 0 ||
        boardParams.completionRules?.numberCardsEdited > 0
      );

    this.completed = new Set();
    if (this.requiresCompletion) {
      this.trackCompletionEvents(this.instance);
    }

    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance'),
    );

    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance],
    );

    callOnceVisible(this.dom, () => {
      this.checkCompletion();
    });
  }

  /**
   * Get the DOM of the board.
   * @returns {HTMLElement} DOM of the board.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get the DOM of the task description.
   * @returns {HTMLElement} DOM of the task description.
   */
  getTaskDescription() {
    return this.taskDescription;
  }

  /**
   * Get the aspect ratio of the board.
   * @returns {number} Aspect ratio (width / height).
   */
  getAspectRatio() {
    const rect = this.dom.getBoundingClientRect();
    return rect.width / rect.height;
  }

  getToolbarMinHeight() {
    return this.instance.getToolbarMinHeight();
  }

  getInstanceAspectRatio() {
    return this.instance.getBoardAspectRatio();
  }

  /**
   * Get the current state of the board when no answer has been given.
   * @returns {object} Current state of the board.
   */
  getCurrentState() {
    return this.instance.getCurrentStateWhenNoAnswerGiven();
  }

  /**
   * Rebuild the instance with the previous state.
   * @param {object} [previousState] Previous state to restore.
   */
  rebuildInstance(previousState = {}) {
    delete this.instance;
    this.isAttached = false;
    this.buildInstance(previousState);
    this.attachInstance();
  }

  /**
   * Attach the instance to the DOM.
   */
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

  /**
   * Get the first focusable child element.
   * @returns {HTMLElement|null} First focusable child element or null if none found.
   */
  getFirstFocusableChild() {
    const focusableElementsString = [
      '.h5p-idea-board-element-interactor',
    ].join(', ');

    return [...this.dom.querySelectorAll(focusableElementsString)]
      .filter((element) => {
        const disabled = element.getAttribute('disabled');
        return disabled !== 'true' && disabled !== true;
      })
      .shift();
  }

  /**
   * Track completion events for the instance.
   * @param {object} instance The instance to track events for.
   */
  trackCompletionEvents(instance) {
    ['edited', 'added'].forEach((eventName) => {
      instance.on(eventName, (event) => {
        const data = event.data;

        this.completed.add({
          type: eventName,
          subContentId: data.subContentId,
          machineName: data.machineName,
        });

        this.checkCompletion();
      });
    });
  }

  /**
   * Check completion of the board.
   */
  checkCompletion() {
    if (this.isCompleted()) {
      this.score = this.params.boardParams.scoreForCompletion;
      this.callbacks.onCompleted();
    }
  }

  /**
   * Check if the board is completed based on the completion rules.
   * @returns {boolean} True if the board is completed, else false.
   */
  isCompleted() {
    if (!this.requiresCompletion) {
      return true;
    }

    const numberCardsCreated = Array.from(this.completed).filter((item) => item.type === 'added').length;

    if (numberCardsCreated < this.params.boardParams.completionRules?.numberCardsCreated) {
      return false;
    }

    const numberCardsEdited = Array.from(this.completed).filter((item) => item.type === 'edited').length;
    if (numberCardsEdited < this.params.boardParams.completionRules?.numberCardsEdited) {
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

  /**
   * Check if the previous board contents should be used.
   * @returns {boolean} True if previous board contents should be used, else false.
   */
  canUsePreviousBoardContents() {
    return !!this.params.boardParams.usePreviousBoardContents;
  }

  /**
   * Reset the board.
   */
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
