import {
    elements,
    cacheElements
} from "./dom.js";

import {
    changeAgentState
} from "./agent.js";

import {
    acceptContact,
    rejectContact,
    toggleHold,
    endContact
} from "./actions.js";

import {
    resetContactPanel
} from "./contact.js";

import {
    showMessage,
    writeLog
} from "./feedback.js";

import {
    initializeStreams
} from "./streams.js";

import {
    initializeOutbound,
    openOutboundDialer,
    closeOutboundDialer,
    handleOutboundNumberInput,
    appendDialPadValue,
    removeLastDialedCharacter,
    startOutboundCall
} from "./outbound.js";

function bindInterfaceEvents() {
    elements.agentStateSelect.addEventListener(
        "change",
        changeAgentState
    );

    elements.btnAccept.addEventListener(
        "click",
        acceptContact
    );

    elements.btnReject.addEventListener(
        "click",
        rejectContact
    );

    elements.btnHold.addEventListener(
        "click",
        toggleHold
    );

    elements.btnEnd.addEventListener(
        "click",
        endContact
    );

    elements.btnOpenDialer.addEventListener(
        "click",
        openOutboundDialer
    );

    elements.btnCloseDialer.addEventListener(
        "click",
        closeOutboundDialer
    );

    elements.outboundNumber.addEventListener(
        "input",
        handleOutboundNumberInput
    );

    elements.outboundNumber.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter") {
                event.preventDefault();

                if (
                    !elements.btnStartOutbound.disabled
                ) {
                    startOutboundCall();
                }
            }

            if (event.key === "Escape") {
                event.preventDefault();
                closeOutboundDialer();
            }
        }
    );

    elements.btnBackspace.addEventListener(
        "click",
        removeLastDialedCharacter
    );

    elements.btnStartOutbound.addEventListener(
        "click",
        startOutboundCall
    );

    elements.dialPadButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                appendDialPadValue
            );
        }
    );
}

function initializeApplication() {
    try {
        cacheElements();
        bindInterfaceEvents();
        resetContactPanel();
        initializeOutbound();
        initializeStreams();

        writeLog("Aplicação carregada.");
    } catch (error) {
        console.error(
            "Erro ao inicializar a aplicação.",
            error
        );

        if (elements.message) {
            showMessage(
                `Erro ao inicializar: ${error.message}`,
                "error"
            );
        }
    }
}

initializeApplication();