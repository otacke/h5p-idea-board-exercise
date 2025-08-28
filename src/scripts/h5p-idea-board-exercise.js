import { addMixins, extend, formatLanguageCode } from '@services/util.js';
import { getSemanticsDefaults } from '@services/util-h5p.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Main from '@components/main.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-idea-board-exercise.scss';

/** @constant {string} DEFAULT_LANGUAGE_TAG Default language tag used if not specified in metadata. */
const DEFAULT_LANGUAGE_TAG = 'en';

/** @constant {number} FULL_SCREEN_DELAY_LARGE_MS Time some browsers need to change full screen. */
const FULL_SCREEN_DELAY_LARGE_MS = 300;

export default class IdeaBoardExercise extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    addMixins(IdeaBoardExercise, [QuestionTypeContract, XAPI]);

    const defaults = extend({}, getSemanticsDefaults());
    this.params = extend(defaults, params);

    // Ensure the first board cannot use previous board contents
    if (this.params.boards?.length > 0) {
      this.params.boards[0].usePreviousBoardContents = false;
    }

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('contentId', this.contentId);
    this.globals.set('isFullscreenSupported', this.isRoot() && H5P.fullscreenSupported);
    this.globals.set('someCanClonePreviousSlide', this.params.boards.some((board) => board.usePreviousBoardContents));
    this.globals.set('resize', () => {
      this.trigger('resize');
    });

    const defaultLanguage = this.extras?.metadata?.defaultLanguage || DEFAULT_LANGUAGE_TAG;
    this.languageTag = formatLanguageCode(defaultLanguage);

    this.previousState = this.extras?.previousState;

    this.main = new Main(
      {
        summary: (this.params.addSummaryScreen && { ...this.params.summaryScreenGroup.summaryScreen }),
        boards: this.params.boards,
        dictionary: this.dictionary,
        globals: this.globals,
        previousState: this.previousState?.main,
      },
      {
        onProgressed: (index) => {
          this.triggerXAPIProgressed(index);
        },
        onCompleted: () => {
          this.triggerXAPIEvent('completed');
        },
        onClickButtonFullscreen: () => {
          this.handleFullscreenClicked();
        }
      }
    );

    this.on('enterFullScreen', () => {
      this.toggleFullscreen(true);

      window.setTimeout(() => {
        // Workaround. It was reported that waiting in main in first call does not always suffice, so trigger anew.
        this.toggleFullscreen(true);
      }, FULL_SCREEN_DELAY_LARGE_MS);
    });

    this.on('exitFullScreen', () => {
      this.toggleFullscreen(false);
    });

    this.on('resize', () => {
      this.main.resize();
    });
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    this.dom = $wrapper.get(0);

    $wrapper.get(0).classList.add('h5p-idea-board-exercise');
    $wrapper.get(0).appendChild(this.main.getDOM());
  }

  /**
   * Handle fullscreen button clicked.
   */
  handleFullscreenClicked() {
    const state = !H5P.isFullscreen;

    if (state) {
      this.container = this.container || this.dom.closest('.h5p-container');
      if (this.container) {
        H5P.fullScreen(H5P.jQuery(this.container), this);
      }
    }
    else {
      H5P.exitFullScreen();
    }
  }

  /**
   * Toggle fullscreen button.
   * @param {boolean} state true for enter, false for exit.
   */
  toggleFullscreen(state) {
    if (!this.dom) {
      return;
    }

    const targetState = typeof state === 'boolean' ? state : H5P.isFullscreen;

    this.main.toggleFullscreen(targetState);
  }
}
