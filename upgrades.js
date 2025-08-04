var H5PUpgrades = H5PUpgrades || {};

/**
 * Upgrades for the Idea Board Exercise content type.
 */
H5PUpgrades['H5P.IdeaBoardExercise'] = (() => {
  return {
    1: {
      /**
       * Asynchronous content upgrade hook.
       * Upgrades content parameters to support Idea Board Exercise 1.3.
       * Change rules' scope
       * @param {object} parameters Content parameters.
       * @param {function} finished Callback when finished.
       * @param {object} extras Extra parameters such as metadata, etc.
       */
      3: (parameters, finished, extras) => {
        if (Array.isArray(parameters?.boards)) {
          parameters.boards = parameters.boards.map((board) => {
            if (typeof board?.completionRules === 'object' && board.completionRules !== null) {
              board.completionRules.numberCardsCreated = board.completionRules.numberTextFieldsCreated;
              delete board.completionRules.numberTextFieldsCreated;

              board.completionRules.numberCardsEdited = board.completionRules.numberTextFieldsEdited;
              delete board.completionRules.numberTextFieldsEdited;
            }

            return board;
          });
        }

        finished(null, parameters, extras);
      },
    },
  };
})();
