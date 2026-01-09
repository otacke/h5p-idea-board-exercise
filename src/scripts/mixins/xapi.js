import { extend } from '@services/util.js';
import { getLibraryTitle } from '@services/util-h5p.js';

/**
 * Mixin containing methods for xapi stuff.
 */
export default class XAPI {
  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    if (verb === 'completed' || verb === 'answered') {
      xAPIEvent.setScoredResult(
        this.getScore(), // Question Type Contract mixin
        this.getMaxScore(), // Question Type Contract mixin
        this,
        true,
        this.getScore() === this.getMaxScore(),
      );
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    return H5P.createTitle(this.extras?.metadata?.title || getLibraryTitle());
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return this.params.header || getLibraryTitle();
  }

  triggerXAPIProgressed(index) {
    const xAPIEvent = this.createXAPIEvent('progressed');

    extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition', 'extensions']),
      { 'http://id.tincanapi.com/extension/ending-point': index },
    );

    this.trigger(xAPIEvent);
  }
}
