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

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('contentId', this.contentId);
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
        }
      }
    );
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-idea-board-exercise');
    $wrapper.get(0).appendChild(this.main.getDOM());
  }
}
