import './summary.scss';

export default class Summary {
  /**
   * @class
   * @param {object} [params] Parameters passed by the editor.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-summary');

    this.buildInstance();
  }

  getDOM() {
    return this.dom;
  }

  buildInstance() {
    this.instance = H5P.newRunnable(
      this.params.contentParams,
      this.params.globals.get('contentId'),
      H5P.jQuery(this.dom),
      true,
      {}
    );

    if (!this.instance) {
      throw new Error('Failed to create Column instance');
    }

    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );

    this.bubbleDown(
      this.params.globals.get('mainInstance'), 'resize', [this.instance]
    );
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
