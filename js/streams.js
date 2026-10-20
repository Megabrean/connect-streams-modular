import { CONNECT_CONFIG } from "./config.js";
import { appState } from "./state.js";
import { elements } from "./dom.js";
import { showMessage, writeLog } from "./feedback.js";
import { handleAgent } from "./agent.js";
import { handleContact } from "./contact.js";
import { updateOutboundAvailability } from "./outbound.js";

export function initializeStreams() {
    const streams = window.connect;

    if (!streams) {
        throw new Error(
            "A biblioteca Amazon Connect Streams não foi carregada."
        );
    }

    streams.core.initCCP(elements.ccpContainer, CONNECT_CONFIG);

    streams.core.onInitialized(() => {
        appState.streamsInitialized = true;

        writeLog(
            "Amazon Connect Streams inicializado."
        );

        showMessage(
            "Amazon Connect Streams inicializado.",
            "success"
        );

        updateOutboundAvailability();
    });

    streams.agent(handleAgent);
    streams.contact(handleContact);
}
