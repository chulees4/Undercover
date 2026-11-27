import {
  isActiveGame,
  isConfig,
  isEliminationTarget,
  integer,
  record,
} from './validation';

export function migrateSession(value: unknown): unknown {
  if (!record(value) || !record(value.config) || !record(value.config.roles))
    return undefined;
  const { roles, ...oldConfig } = value.config;
  const config = {
    ...oldConfig,
    justiceEnabled: roles.justice,
    loversEnabled: roles.lovers,
    avengerEnabled: roles.avenger,
  };
  if (!isConfig(config)) return undefined;

  const description = {
    type: 'description',
    order: value.speakerOrder,
    index: value.activeSpeakerIdx,
  };
  let phase: unknown;
  switch (value.status) {
    case 'DISTRIBUTE':
      if (value.subState !== 'PRIVACY' && value.subState !== 'CARD')
        return undefined;
      phase = {
        type: 'reveal',
        index: value.distributeIndex,
        step: value.subState === 'CARD' ? 'card' : 'privacy',
      };
      break;
    case 'DESCRIPTION':
      phase = description;
      break;
    case 'VOTING': {
      if (config.votingMode === 'offline') {
        phase = {
          type: 'offline-vote',
          discussion: description,
          selectedId: null,
        };
        break;
      }
      const vote = value.secretVote;
      if (
        !record(vote) ||
        !Array.isArray(vote.voterIds) ||
        !integer(vote.currentVoterIdx) ||
        vote.currentVoterIdx > vote.voterIds.length ||
        (vote.stage !== 'PRIVACY' &&
          vote.stage !== 'PICK' &&
          vote.stage !== 'TALLY')
      )
        return undefined;
      phase = {
        type: 'secret-vote',
        candidates: vote.allowedTargetIds,
        voters:
          vote.stage === 'TALLY'
            ? []
            : vote.voterIds.slice(vote.currentVoterIdx),
        votes: {},
        priorCounts: vote.votes,
        runoff: vote.isRevote ? 1 : 0,
        step: vote.stage === 'TALLY' ? 'tally' : 'privacy',
      };
      break;
    }
    case 'ELIMINATION': {
      const elimination = value.eliminationState;
      if (
        !record(elimination) ||
        !isEliminationTarget(elimination.current) ||
        !Array.isArray(elimination.queue)
      )
        return undefined;
      const target = elimination.current;
      const pending = elimination.queue.filter(
        (entry: unknown) =>
          !isEliminationTarget(entry) || entry.playerId !== target.playerId,
      );
      const avengerChosen = pending.some(
        (entry: unknown) =>
          isEliminationTarget(entry) && entry.cause === 'AVENGER',
      );
      const loverQueued = pending.some(
        (entry: unknown) =>
          isEliminationTarget(entry) && entry.cause === 'LOVER',
      );
      // The legacy White checkpoint was saved before the guess. A later queued
      // effect proves that the guess has already been resolved.
      const step = elimination.avengerHandled
        ? avengerChosen
          ? 'settle'
          : 'revenge'
        : elimination.loverHandled && loverQueued
          ? 'lover'
          : elimination.mrWhiteHandled
            ? 'guess'
            : 'card';
      phase = { type: 'elimination', target, step, pending };
      break;
    }
    case 'SETUP':
    case 'ENDGAME':
      return null;
    default:
      return undefined;
  }
  const game = {
    sessionId: value.sessionId,
    config,
    roundNumber: value.roundNumber,
    pair: value.currentWordPair,
    players: value.players,
    firstSpeakerId: value.firstSpeakerId,
    phase,
  };
  return isActiveGame(game) ? game : undefined;
}
