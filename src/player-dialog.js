// The "who are you?" popup: name + unique username.
// New username → create player. Existing username → ask "is that you?" and load their history.

import { STRINGS } from './strings.js';
import { validateName, validateUsername } from './storage.js';
import { el, openModal } from './ui.js';

/**
 * @returns {Promise<{player: object, returning: boolean} | null>} null if dismissed (only when not required)
 */
export function openPlayerDialog(store, { required = false } = {}) {
  return new Promise((resolve) => {
    openModal({ id: 'player-dialog', labelledBy: 'player-dialog-title', required, onClose: (v) => resolve(v ?? null), className: 'player-dialog' }, (close) => {
      const nameInput = el('input', {
        id: 'player-name',
        name: 'name',
        type: 'text',
        maxlength: '40',
        autocomplete: 'name',
        placeholder: STRINGS.namePlaceholder,
        required: true,
        autofocus: true,
      });
      const userInput = el('input', {
        id: 'player-username',
        name: 'username',
        type: 'text',
        maxlength: '20',
        autocomplete: 'username',
        autocapitalize: 'off',
        spellcheck: 'false',
        placeholder: STRINGS.usernamePlaceholder,
        required: true,
        'aria-describedby': 'player-username-help',
      });
      const nameErr = el('p', { class: 'field-error', id: 'player-name-error', role: 'alert' });
      const userErr = el('p', { class: 'field-error', id: 'player-username-error', role: 'alert' });
      const existsBox = el('div', { class: 'exists-box', id: 'player-exists', hidden: true });

      const setErr = (node, input, key) => {
        node.textContent = key ? STRINGS.errors[key] || key : '';
        input.setAttribute('aria-invalid', key ? 'true' : 'false');
      };

      userInput.addEventListener('input', () => {
        existsBox.hidden = true;
        setErr(userErr, userInput, null);
      });
      nameInput.addEventListener('input', () => setErr(nameErr, nameInput, null));

      const form = el(
        'form',
        { novalidate: true },
        el('label', { for: 'player-name', text: STRINGS.nameLabel }),
        nameInput,
        nameErr,
        el('label', { for: 'player-username', text: STRINGS.usernameLabel }),
        userInput,
        el('p', { class: 'field-help', id: 'player-username-help', text: STRINGS.usernameHelp }),
        userErr,
        existsBox,
        el('div', { class: 'dialog-actions' }, el('button', { type: 'submit', class: 'btn btn-primary btn-big', id: 'player-submit', text: STRINGS.playerSubmit })),
      );

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const username = userInput.value.trim();
        const ne = validateName(name);
        const ue = validateUsername(username);
        setErr(nameErr, nameInput, ne);
        setErr(userErr, userInput, ue);
        if (ne) return nameInput.focus();
        if (ue) return userInput.focus();

        const existing = store.findPlayer(username);
        if (!existing) {
          try {
            const player = store.createPlayer({ name, username });
            close({ player, returning: false });
          } catch (err) {
            setErr(userErr, userInput, err.code || 'usernameTaken');
          }
          return;
        }
        // Username already exists: it is unique, so this can only be that same player.
        const sum = store.summary(username);
        existsBox.replaceChildren(
          el('p', { class: 'exists-title', text: STRINGS.playerExistsTitle(existing.username) }),
          el('p', { text: STRINGS.playerExistsText(existing.name, sum.completed, sum.total) }),
          el(
            'div',
            { class: 'exists-actions' },
            el('button', {
              type: 'button',
              class: 'btn btn-primary',
              id: 'player-exists-yes',
              text: STRINGS.playerExistsYes,
              onclick: () => close({ player: store.login(username), returning: true }),
            }),
            el('button', {
              type: 'button',
              class: 'btn btn-ghost',
              id: 'player-exists-no',
              text: STRINGS.playerExistsNo,
              onclick: () => {
                existsBox.hidden = true;
                setErr(userErr, userInput, 'usernameTaken');
                userInput.select();
                userInput.focus();
              },
            }),
          ),
        );
        existsBox.hidden = false;
        existsBox.querySelector('#player-exists-yes').focus();
      });

      return el(
        'div',
        {},
        el('div', { class: 'dialog-badge', 'aria-hidden': 'true' }, el('span', { class: 'mini-source', text: '+' }), el('span', { class: 'mini-sink', text: '−' })),
        el('h2', { id: 'player-dialog-title', text: STRINGS.playerDialogTitle }),
        el('p', { class: 'muted', text: STRINGS.playerDialogText }),
        form,
      );
    });
  });
}
