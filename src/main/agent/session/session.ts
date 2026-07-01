import type { Config } from '../core/config';
import type { SessionInput, SessionCategory } from '../core/types';
import { addAssistantMessage as addAssistantMessageToState } from './session-add-assistant-message';
import { addToolResults as addToolResultsToState } from './session-add-tool-results';
import { appendRun as appendRunToState } from './session-append-run';
import { clearMessages as clearSessionMessages } from './session-clear-messages';
import { init as initSession } from './session-init';
import { isExhausted as sessionIsExhausted } from './session-is-exhausted';
import { loadMessages as loadSessionMessages } from './session-load-messages';
import { createSessionState } from './session-module-state';
import { recordTurn as recordSessionTurn } from './session-record-turn';
import { toResult as sessionToResult } from './session-to-result';
import type { Session } from './session-types';

export function session(config: Config): Session {
	const state = createSessionState();

	const self = {
		get id() {
			return state.id;
		},
		set id(value: string) {
			state.id = value;
		},
		get messages() {
			return state.messages;
		},
		set messages(value) {
			state.messages = value;
		},
		get toolCalls() {
			return state.toolCalls;
		},
		get usage() {
			return state.usage;
		},
		get maxTurns() {
			return state.maxTurns;
		},
		set maxTurns(value: number) {
			state.maxTurns = value;
		},
		get model() {
			return state.model;
		},
		set model(value: string) {
			state.model = value;
		},
		get numTurns() {
			return state.numTurns;
		},
		set numTurns(value: number) {
			state.numTurns = value;
		},
		get finalText() {
			return state.finalText;
		},
		set finalText(value: string) {
			state.finalText = value;
		},
		get stopReason() {
			return state.stopReason;
		},
		set stopReason(value: string | undefined) {
			state.stopReason = value;
		},
		get isExhausted() {
			return sessionIsExhausted(state);
		},
		init(input: SessionInput, category?: SessionCategory): Session {
			return initSession(state, config, () => self, input, category);
		},
		loadMessages(sessionId: string, category?: SessionCategory) {
			return loadSessionMessages(config, sessionId, category);
		},
		clearMessages(sessionId: string, category?: SessionCategory): void {
			clearSessionMessages(state, config, sessionId, category);
		},
		appendRun(entry: unknown): void {
			appendRunToState(state, entry);
		},
		recordTurn(turn) {
			recordSessionTurn(state, turn);
		},
		addAssistantMessage(content, toolCalls, providerItems) {
			addAssistantMessageToState(state, content, toolCalls, providerItems);
		},
		addToolResults(calls) {
			addToolResultsToState(state, calls);
		},
		toResult(subtype) {
			return sessionToResult(state, subtype);
		},
	} satisfies Session;

	return self;
}
