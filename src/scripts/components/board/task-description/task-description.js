import './task-description.scss';

export default class taskDescription {
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-idea-board-exercise-task-description');

    const text = document.createElement('div');
    text.classList.add('h5p-idea-board-exercise-task-description-text');
    text.innerHTML = this.params.description ?? '';
    this.dom.appendChild(text);

    const descriptionNotes = this.buildNotesList(this.params.completionRules);
    if (descriptionNotes.childElementCount > 0) {
      this.dom.appendChild(descriptionNotes);
    }
  }

  getDOM() {
    return this.dom;
  }

  buildNotesList(rules) {
    const notesList = document.createElement('ul');
    notesList.classList.add('h5p-idea-board-exercise-task-description-notes');
    Object.entries(rules ?? {})
      .filter(([key, value]) => {
        return !!value && this.params.dictionary.get(`l10n.${key}Note`);
      })
      .forEach(([key, value]) => {
        const listItem = this.buildNotesListItem(key, value);
        notesList.appendChild(listItem);
      });

    return notesList;
  }

  buildNotesListItem(key, value) {
    const listItem = document.createElement('li');
    listItem.classList.add('h5p-idea-board-exercise-task-description-note');
    listItem.innerHTML = this.params.dictionary.get(`l10n.${key}Note`).replace('@count', value);
    return listItem;
  }
}
