import { CONNECTOR_DEFAULTS } from '../../../shared/connector';
import { SimpleConnector } from './connector';

export const SIMPLE_CONNECTORS = CONNECTOR_DEFAULTS.map((connector) => new SimpleConnector(connector));
