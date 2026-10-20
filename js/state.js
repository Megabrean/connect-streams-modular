export const appState = {
    currentAgent: null,
    currentContact: null,
    availableAgentStates: [],
    currentContactPhase: "none",
    currentHoldState: false,
    holdActionPending: null,
    outboundActionPending: false,
    streamsInitialized: false
};

export function resetContactState() {
    appState.currentContact = null;
    appState.currentContactPhase = "none";
    appState.currentHoldState = false;
    appState.holdActionPending = null;
    appState.outboundActionPending = false;
}