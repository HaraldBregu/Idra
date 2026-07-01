import type { Config } from '../core/config';
import type { SessionInput, SessionCategory } from '../core/types';
import { addAssistantMessage } from './session-add-assistant-message';
import { addToolResults } from './session-add-tool-results';
import { appendRun } from './session-append-run';
import { clearMessages } from './session-clear-messages';
import { init } from './session-init';
import { isExhausted } from './session-is-exhausted';
import { loadMessages } from './session-load-messages';
import { createSessionState } from './session-module-state';
import { recordTurn } from './session-record-turn';
import { toResult } from './session-to-result';
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
			return isExhausted(state);
		},
		init(input: SessionInput, category?: SessionCategory): Session {
			return init(state, config, () => self, input, category);
		},
		loadMessages(sessionId: string, category?: SessionCategory) {
			return loadMessages(config, sessionId, category);
		},
		clearMessages(sessionId: string, category?: SessionCategory): void {
			clearMessages(state, config, sessionId, category);
		},
		appendRun(entry: unknown): void {
			appendRun(state, entry);
		},
		recordTurn(turn) {
			recordTurn(state, turn);
		},
		addAssistantMessage(content, toolCalls, providerItems) {
			addAssistantMessage(state, content, toolCalls, providerItems);
		},
		addToolResults(calls) {
			addToolResults(state, calls);
		},
		toResult(subtype) {
			return toResult(state, subtype);
		},
	} satisfies Session;

	return self;
}
