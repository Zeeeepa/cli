/**
 * Event Type Definitions for TestDriver Server
 * 
 * All events in the system follow this structure for consistency
 * and to enable proper event sourcing / replay capabilities.
 */

/**
 * Event Types Enum
 */
const EventTypes = {
  // Session Lifecycle Events
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',
  SESSION_PAUSED: 'session:paused',
  SESSION_RESUMED: 'session:resumed',
  SESSION_STATE_SNAPSHOT: 'session:state-snapshot',
  SESSION_CREATED: 'session:created',
  SESSION_DELETED: 'session:deleted',
  SESSION_SNAPSHOT_RESTORED: 'session:snapshot-restored',
  
  // Step Execution Events
  STEP_STARTED: 'step:started',
  STEP_EXECUTED: 'step:executed',
  STEP_FAILED: 'step:failed',
  STEP_SKIPPED: 'step:skipped',
  STEP_RETRYING: 'step:retrying',
  
  // Test Generation Events
  TEST_GENERATION_STARTED: 'test.generation.started',
  TEST_GENERATION_COMPLETED: 'test.generation.completed',
  TEST_GENERATION_FAILED: 'test.generation.failed',
  COMMAND_GENERATION_STARTED: 'command.generation.started',
  COMMAND_GENERATION_COMPLETED: 'command.generation.completed',
  COMMAND_GENERATION_FAILED: 'command.generation.failed',
  
  // Exploration Events
  EXPLORATION_STARTED: 'exploration.started',
  EXPLORATION_STEP_COMPLETED: 'exploration.step.completed',
  EXPLORATION_STEP_FAILED: 'exploration.step.failed',
  
  // Persistence Events
  TEST_SAVED: 'test.saved',
  TEST_LOADED: 'test.loaded',
  TEST_DELETED: 'test.deleted',
  
  // Validation Events
  VALIDATION_STARTED: 'validation.started',
  VALIDATION_COMPLETED: 'validation.completed',
  VALIDATION_FAILED: 'validation.failed',
  
  // Recording Events
  RECORDING_STARTED: 'recording:started',
  RECORDING_STOPPED: 'recording:stopped',
  SCREENSHOT_CAPTURED: 'recording:screenshot',
  DOM_SNAPSHOT_CAPTURED: 'recording:dom-snapshot',
  NETWORK_LOG_CAPTURED: 'recording:network-log',
  CONSOLE_LOG_CAPTURED: 'recording:console-log',
  
  // Assertion Events
  ASSERTION_PASSED: 'assertion:passed',
  ASSERTION_FAILED: 'assertion:failed',
  
  // Element Finding Events
  ELEMENT_FOUND: 'element:found',
  ELEMENT_NOT_FOUND: 'element:not-found',
  
  // Self-Healing Events
  HEALING_TRIGGERED: 'healing:triggered',
  HEALING_ATTEMPT: 'healing:attempt',
  HEALING_SUCCESS: 'healing:success',
  HEALING_FAILED: 'healing:failed',
  TEST_FILE_PATCHED: 'healing:file-patched',
  
  // Streaming Events
  CLIENT_CONNECTED: 'streaming:client-connected',
  CLIENT_DISCONNECTED: 'streaming:client-disconnected',
  STREAMING_STARTED: 'streaming:started',
  STREAMING_STOPPED: 'streaming:stopped',
  
  // Performance Events
  PERFORMANCE_METRIC: 'performance:metric',
  
  // Browser Extension Events
  BROWSER_LOG_ENTRY: 'browser:log-entry',
  BROWSER_NETWORK_REQUEST: 'browser:network-request',
  BROWSER_DOM_MUTATION: 'browser:dom-mutation',
  BROWSER_STATE_CHANGE: 'browser:state-change',
  
  // Error Events
  ERROR_OCCURRED: 'error:occurred',
  WARNING_OCCURRED: 'warning:occurred'
};

/**
 * Base Event Schema
 */
class BaseEvent {
  constructor(type, data, metadata = {}) {
    this.id = this.generateEventId();
    this.type = type;
    this.timestamp = Date.now();
    this.data = data;
    this.metadata = {
      sessionId: metadata.sessionId || null,
      userId: metadata.userId || null,
      source: metadata.source || 'server',
      ...metadata
    };
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.data,
      metadata: this.metadata
    };
  }
}

/**
 * Test Generation Event Classes
 */
class TestGenerationStartedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_GENERATION_STARTED, data, { sessionId });
  }
}

class TestGenerationCompletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_GENERATION_COMPLETED, data, { sessionId });
  }
}

class TestGenerationFailedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_GENERATION_FAILED, data, { sessionId });
  }
}

class CommandGenerationStartedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.COMMAND_GENERATION_STARTED, data, { sessionId });
  }
}

class CommandGenerationCompletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.COMMAND_GENERATION_COMPLETED, data, { sessionId });
  }
}

class CommandGenerationFailedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.COMMAND_GENERATION_FAILED, data, { sessionId });
  }
}

/**
 * Exploration Event Classes
 */
class ExplorationStartedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.EXPLORATION_STARTED, data, { sessionId });
  }
}

class ExplorationStepCompletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.EXPLORATION_STEP_COMPLETED, data, { sessionId });
  }
}

class ExplorationStepFailedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.EXPLORATION_STEP_FAILED, data, { sessionId });
  }
}

/**
 * Persistence Event Classes
 */
class TestSavedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_SAVED, data, { sessionId });
  }
}

class TestLoadedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_LOADED, data, { sessionId });
  }
}

class TestDeletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.TEST_DELETED, data, { sessionId });
  }
}

/**
 * Validation Event Classes
 */
class ValidationStartedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.VALIDATION_STARTED, data, { sessionId });
  }
}

class ValidationCompletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.VALIDATION_COMPLETED, data, { sessionId });
  }
}

class ValidationFailedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.VALIDATION_FAILED, data, { sessionId });
  }
}

/**
 * Session Event Classes
 */
class SessionCreatedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.SESSION_CREATED, data, { sessionId });
  }
}

class SessionDeletedEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.SESSION_DELETED, data, { sessionId });
  }
}

class SessionSnapshotRestoredEvent extends BaseEvent {
  constructor(data = {}) {
    const sessionId = data.sessionId || 'unknown';
    super(EventTypes.SESSION_SNAPSHOT_RESTORED, data, { sessionId });
  }
}

class SessionStartedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.SESSION_STARTED, data, { sessionId });
  }
}

class SessionEndedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.SESSION_ENDED, data, { sessionId });
  }
}

class SessionPausedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.SESSION_PAUSED, data, { sessionId });
  }
}

class SessionResumedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.SESSION_RESUMED, data, { sessionId });
  }
}

/**
 * Step Execution Event Classes
 */
class StepExecutedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.STEP_EXECUTED, {
      commandType: data.commandType,
      command: data.command,
      result: data.result,
      duration: data.duration,
      screenshot: data.screenshot,
      stepIndex: data.stepIndex,
      ...data
    }, { sessionId });
  }
}

class StepFailedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.STEP_FAILED, {
      commandType: data.commandType,
      command: data.command,
      error: data.error,
      stepIndex: data.stepIndex,
      ...data
    }, { sessionId });
  }
}

/**
 * Recording Event Classes
 */
class ScreenshotCapturedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.SCREENSHOT_CAPTURED, {
      screenshotId: data.screenshotId,
      path: data.path,
      buffer: data.buffer,
      width: data.width,
      height: data.height,
      format: data.format || 'png',
      stepIndex: data.stepIndex,
      ...data
    }, { sessionId });
  }
}

class DOMSnapshotCapturedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.DOM_SNAPSHOT_CAPTURED, {
      snapshotId: data.snapshotId,
      html: data.html,
      url: data.url,
      stepIndex: data.stepIndex,
      ...data
    }, { sessionId });
  }
}

class NetworkLogCapturedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.NETWORK_LOG_CAPTURED, {
      method: data.method,
      url: data.url,
      status: data.status,
      duration: data.duration,
      requestHeaders: data.requestHeaders,
      responseHeaders: data.responseHeaders,
      ...data
    }, { sessionId });
  }
}

class ConsoleLogCapturedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.CONSOLE_LOG_CAPTURED, {
      level: data.level, // log, warn, error, info
      message: data.message,
      args: data.args,
      stackTrace: data.stackTrace,
      ...data
    }, { sessionId });
  }
}

/**
 * Self-Healing Event Classes
 */
class HealingTriggeredEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.HEALING_TRIGGERED, {
      failedCommand: data.failedCommand,
      reason: data.reason,
      attemptNumber: data.attemptNumber || 1,
      ...data
    }, { sessionId });
  }
}

class TestFilePatchedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.TEST_FILE_PATCHED, {
      filename: data.filename,
      oldCommand: data.oldCommand,
      newCommand: data.newCommand,
      patch: data.patch,
      confidence: data.confidence,
      ...data
    }, { sessionId });
  }
}

/**
 * Streaming Event Classes
 */
class ClientConnectedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.CLIENT_CONNECTED, {
      clientId: data.clientId,
      clientType: data.clientType, // viewer, dashcam, extension, controller
      userAgent: data.userAgent,
      ...data
    }, { sessionId });
  }
}

class ClientDisconnectedEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.CLIENT_DISCONNECTED, {
      clientId: data.clientId,
      clientType: data.clientType,
      reason: data.reason,
      ...data
    }, { sessionId });
  }
}

/**
 * Performance Event Class
 */
class PerformanceMetricEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.PERFORMANCE_METRIC, {
      metricName: data.metricName,
      value: data.value,
      unit: data.unit,
      ...data
    }, { sessionId });
  }
}

/**
 * Browser Extension Event Classes
 */
class BrowserLogEntryEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.BROWSER_LOG_ENTRY, {
      level: data.level,
      message: data.message,
      source: data.source,
      ...data
    }, { sessionId, source: 'browser-extension' });
  }
}

/**
 * Error Event Class
 */
class ErrorOccurredEvent extends BaseEvent {
  constructor(sessionId, data = {}) {
    super(EventTypes.ERROR_OCCURRED, {
      error: data.error,
      stack: data.stack,
      context: data.context,
      ...data
    }, { sessionId });
  }
}

/**
 * Event Validation
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be an object');
  }
  
  if (!event.type || !Object.values(EventTypes).includes(event.type)) {
    throw new Error(`Invalid event type: ${event.type}`);
  }
  
  if (!event.timestamp || typeof event.timestamp !== 'number') {
    throw new Error('Event must have a valid timestamp');
  }
  
  return true;
}

/**
 * Event Factory
 */
function createEvent(type, sessionId, data = {}) {
  const EventClassMap = {
    [EventTypes.SESSION_STARTED]: SessionStartedEvent,
    [EventTypes.SESSION_ENDED]: SessionEndedEvent,
    [EventTypes.SESSION_PAUSED]: SessionPausedEvent,
    [EventTypes.SESSION_RESUMED]: SessionResumedEvent,
    [EventTypes.STEP_EXECUTED]: StepExecutedEvent,
    [EventTypes.STEP_FAILED]: StepFailedEvent,
    [EventTypes.SCREENSHOT_CAPTURED]: ScreenshotCapturedEvent,
    [EventTypes.DOM_SNAPSHOT_CAPTURED]: DOMSnapshotCapturedEvent,
    [EventTypes.NETWORK_LOG_CAPTURED]: NetworkLogCapturedEvent,
    [EventTypes.CONSOLE_LOG_CAPTURED]: ConsoleLogCapturedEvent,
    [EventTypes.HEALING_TRIGGERED]: HealingTriggeredEvent,
    [EventTypes.TEST_FILE_PATCHED]: TestFilePatchedEvent,
    [EventTypes.CLIENT_CONNECTED]: ClientConnectedEvent,
    [EventTypes.CLIENT_DISCONNECTED]: ClientDisconnectedEvent,
    [EventTypes.PERFORMANCE_METRIC]: PerformanceMetricEvent,
    [EventTypes.BROWSER_LOG_ENTRY]: BrowserLogEntryEvent,
    [EventTypes.ERROR_OCCURRED]: ErrorOccurredEvent
  };

  const EventClass = EventClassMap[type];
  if (!EventClass) {
    return new BaseEvent(type, data, { sessionId });
  }

  return new EventClass(sessionId, data);
}

module.exports = {
  EventTypes,
  BaseEvent,
  
  // Test Generation Events
  TestGenerationStartedEvent,
  TestGenerationCompletedEvent,
  TestGenerationFailedEvent,
  CommandGenerationStartedEvent,
  CommandGenerationCompletedEvent,
  CommandGenerationFailedEvent,
  
  // Exploration Events
  ExplorationStartedEvent,
  ExplorationStepCompletedEvent,
  ExplorationStepFailedEvent,
  
  // Persistence Events
  TestSavedEvent,
  TestLoadedEvent,
  TestDeletedEvent,
  
  // Validation Events
  ValidationStartedEvent,
  ValidationCompletedEvent,
  ValidationFailedEvent,
  
  // Session Events
  SessionCreatedEvent,
  SessionDeletedEvent,
  SessionSnapshotRestoredEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  
  // Step Events
  StepExecutedEvent,
  StepFailedEvent,
  
  // Recording Events
  ScreenshotCapturedEvent,
  DOMSnapshotCapturedEvent,
  NetworkLogCapturedEvent,
  ConsoleLogCapturedEvent,
  
  // Self-Healing Events
  HealingTriggeredEvent,
  TestFilePatchedEvent,
  
  // Streaming Events
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  
  // Performance Events
  PerformanceMetricEvent,
  
  // Browser Events
  BrowserLogEntryEvent,
  
  // Error Events
  ErrorOccurredEvent,
  
  // Utilities
  validateEvent,
  createEvent
};
