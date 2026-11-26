import { useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import type { WordPair } from '../../game/model';
import { Dialog } from '../../shared/components';
import styles from './CustomWords.module.css';

export function CustomWords({
  words,
  send,
  close,
}: {
  words: WordPair[];
  send: (action: Command) => boolean;
  close: () => void;
}) {
  const [civilian, setCivilian] = useState('');
  const [undercover, setUndercover] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <Dialog title="✍️ Quản lý từ tự tạo" close={close}>
      <form
        class={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (
            send({
              type: 'ADD_WORD',
              pair: {
                id: `cw_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                category: 'custom',
                word_civilian: civilian.trim(),
                word_undercover: undercover.trim(),
                synonyms: synonyms
                  .split(',')
                  .map((word) => word.trim())
                  .filter(Boolean),
              },
            })
          ) {
            setCivilian('');
            setUndercover('');
            setSynonyms('');
            setNotice('Đã thêm cặp từ.');
          } else {
            setNotice('Nhập hai từ khóa khác nhau.');
          }
        }}
      >
        <label for="cwCiv">Từ Dân thường</label>
        <input
          class="input-field"
          id="cwCiv"
          value={civilian}
          onInput={(event) => setCivilian(event.currentTarget.value)}
        />
        <label for="cwUnd">Từ Gián điệp</label>
        <input
          class="input-field"
          id="cwUnd"
          value={undercover}
          onInput={(event) => setUndercover(event.currentTarget.value)}
        />
        <label for="cwSyn">Từ đồng nghĩa (cách nhau bằng dấu phẩy)</label>
        <input
          class="input-field"
          id="cwSyn"
          value={synonyms}
          onInput={(event) => setSynonyms(event.currentTarget.value)}
        />
        <button class="btn btn-primary" type="submit">
          + Thêm cặp từ
        </button>
      </form>
      <p role="status">{notice}</p>
      <h3>{words.length} cặp từ tự tạo</h3>
      <ul class={styles.list}>
        {words.map((word) => (
          <li key={word.id}>
            <div>
              <strong>
                {word.word_civilian} / {word.word_undercover}
              </strong>
              {word.synonyms.length > 0 && (
                <div>{word.synonyms.join(', ')}</div>
              )}
            </div>
            <button
              class="icon-btn"
              aria-label={`Xóa cặp từ ${word.word_civilian} và ${word.word_undercover}`}
              onClick={() => send({ type: 'DELETE_WORD', id: word.id })}
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
