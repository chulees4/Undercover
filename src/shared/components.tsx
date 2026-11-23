import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Player } from '../game/model';
import styles from './components.module.css';

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <section class="glass-card">
      <div class="card-title">
        <h2 class="card-title-left">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close?: () => void;
  children: ComponentChildren;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      class={`modal-box ${styles.dialog}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close?.();
      }}
    >
      <div class="modal-header">
        <h2>{title}</h2>
        {close && (
          <button
            type="button"
            class="icon-btn modal-close"
            aria-label="Đóng"
            onClick={close}
          >
            ✕
          </button>
        )}
      </div>
      <div class="modal-body">{children}</div>
    </dialog>
  );
}

export function PlayerBadge({ player }: { player: Player }) {
  return (
    <div class="player-badge-lg">
      <span class="avatar">{player.avatar}</span>
      <strong>{player.name}</strong>
    </div>
  );
}

export function PlayerGrid({
  players,
  status,
  selectedId,
  activeId,
  choose,
}: {
  players: Player[];
  status: (player: Player) => string;
  selectedId?: string | null;
  activeId?: string;
  choose?: (id: string) => void;
}) {
  return (
    <div class="player-grid">
      {players.map((player) => {
        const className = [
          'player-card',
          choose && 'clickable',
          selectedId === player.id && 'selected-target',
          activeId === player.id && 'active-speaker',
          !player.isAlive && 'dead',
        ]
          .filter(Boolean)
          .join(' ');
        const contents = (
          <>
            <span class="p-avatar">{player.avatar}</span>
            <span class="p-info">
              <span class="p-name">{player.name}</span>
              <span class="p-status">{status(player)}</span>
            </span>
          </>
        );
        return choose ? (
          <button
            type="button"
            key={player.id}
            class={`${className} ${styles.playerButton}`}
            aria-pressed={
              selectedId === undefined ? undefined : selectedId === player.id
            }
            onClick={() => choose(player.id)}
          >
            {contents}
          </button>
        ) : (
          <div key={player.id} class={className}>
            {contents}
          </div>
        );
      })}
    </div>
  );
}
