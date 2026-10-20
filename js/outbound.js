import { appState } from "./state.js";
import { elements } from "./dom.js";
import {
    showMessage,
    showActionError,
    writeLog
} from "./feedback.js";

export function initializeOutbound() {
    updateOutboundAvailability();
    updateCallButtonState();
}

export function openOutboundDialer() {
    if (!canStartOutboundCall()) {
        showMessage(
            "Não é possível iniciar uma nova chamada neste momento.",
            "error"
        );
        updateOutboundAvailability();
        return;
    }

    elements.outboundDialer.hidden = false;
    elements.btnOpenDialer.hidden = true;

    elements.outboundNumber.value = "";
    updateCallButtonState();

    window.setTimeout(() => {
        elements.outboundNumber.focus();
    }, 0);

    writeLog("Discador outbound aberto.");
}

export function closeOutboundDialer() {
    if (appState.outboundActionPending) {
        return;
    }

    elements.outboundDialer.hidden = true;
    elements.btnOpenDialer.hidden = false;

    elements.outboundNumber.value = "";
    updateCallButtonState();
    updateOutboundAvailability();

    writeLog("Discador outbound fechado.");
}

export function handleOutboundNumberInput(event) {
    const sanitizedNumber = sanitizePhoneNumber(
        event.target.value
    );

    if (event.target.value !== sanitizedNumber) {
        event.target.value = sanitizedNumber;
    }

    updateCallButtonState();
}

export function appendDialPadValue(event) {
    const value = event.currentTarget.dataset.value;

    if (!value || appState.outboundActionPending) {
        return;
    }

    const currentValue =
        elements.outboundNumber.value;

    elements.outboundNumber.value =
        sanitizePhoneNumber(
            `${currentValue}${value}`
        );

    updateCallButtonState();
    elements.outboundNumber.focus();
}

export function removeLastDialedCharacter() {
    if (appState.outboundActionPending) {
        return;
    }

    elements.outboundNumber.value =
        elements.outboundNumber.value.slice(
            0,
            -1
        );

    updateCallButtonState();
    elements.outboundNumber.focus();
}

export function startOutboundCall() {
    if (appState.outboundActionPending) {
        showMessage(
            "A solicitação de chamada já está em andamento.",
            "info"
        );
        return;
    }

    if (!canStartOutboundCall()) {
        showMessage(
            "O agente não está disponível para iniciar uma chamada.",
            "error"
        );
        updateOutboundAvailability();
        return;
    }

    const phoneNumber = normalizePhoneNumber(
        elements.outboundNumber.value
    );

    if (!isValidPhoneNumber(phoneNumber)) {
        showMessage(
            "Informe um número válido para realizar a chamada.",
            "error"
        );
        updateCallButtonState();
        return;
    }

    const streams = window.connect;

    if (
        !streams
        || !streams.Endpoint
        || typeof streams.Endpoint.byPhoneNumber
        !== "function"
    ) {
        showMessage(
            "O recurso de chamada outbound não está disponível.",
            "error"
        );
        writeLog(
            "connect.Endpoint.byPhoneNumber não está disponível."
        );
        return;
    }

    const endpoint =
        streams.Endpoint.byPhoneNumber(
            phoneNumber
        );

    appState.outboundActionPending = true;

    setDialerPendingState(true);

    showMessage(
        `Iniciando chamada para ${phoneNumber}...`,
        "info"
    );

    writeLog(
        `Solicitando chamada outbound para ${phoneNumber}.`
    );

    appState.currentAgent.connect(
        endpoint,
        {
            success: () => {
                /*
                 * O contato outbound será entregue posteriormente
                 * pelo callback connect.contact(handleContact).
                 * É nesse momento que currentContact será preenchido.
                 */
                showMessage(
                    `Chamada para ${phoneNumber} iniciada.`,
                    "success"
                );

                writeLog(
                    `Solicitação outbound aceita para ${phoneNumber}.`
                );

                elements.outboundNumber.value = "";
                updateCallButtonState();
            },

            failure: (error) => {
                appState.outboundActionPending = false;

                setDialerPendingState(false);
                updateOutboundAvailability();
                updateCallButtonState();

                showActionError(
                    "Não foi possível iniciar a chamada",
                    error
                );
            }
        }
    );
}

export function updateOutboundAvailability() {
    if (!elements.btnOpenDialer) {
        return;
    }

    const canStart = canStartOutboundCall();

    elements.btnOpenDialer.disabled = !canStart;

    if (
        !canStart
        && !elements.outboundDialer.hidden
        && !appState.outboundActionPending
    ) {
        elements.outboundDialer.hidden = true;
        elements.btnOpenDialer.hidden = false;
        elements.outboundNumber.value = "";
    }

    setDialerPendingState(
        appState.outboundActionPending
    );

    updateCallButtonState();
}

function canStartOutboundCall() {
    return Boolean(
        appState.streamsInitialized
        && appState.currentAgent
        && !appState.currentContact
        && !appState.outboundActionPending
    );
}

function updateCallButtonState() {
    if (!elements.btnStartOutbound) {
        return;
    }

    const phoneNumber = normalizePhoneNumber(
        elements.outboundNumber.value
    );

    elements.btnStartOutbound.disabled =
        appState.outboundActionPending
        || !canStartOutboundCall()
        || !isValidPhoneNumber(phoneNumber);
}

function setDialerPendingState(pending) {
    if (!elements.outboundNumber) {
        return;
    }

    elements.outboundNumber.disabled = pending;
    elements.btnCloseDialer.disabled = pending;
    elements.btnBackspace.disabled = pending;

    elements.dialPadButtons.forEach(
        (button) => {
            button.disabled = pending;
        }
    );

    elements.btnStartOutbound.textContent =
        pending
            ? "Chamando..."
            : "Chamar";
}

function sanitizePhoneNumber(value) {
    const rawValue = String(value || "");

    let sanitized = rawValue.replace(
        /[^0-9+*#]/g,
        ""
    );

    /*
     * O sinal de + somente pode existir no início.
     */
    const hasLeadingPlus =
        sanitized.startsWith("+");

    sanitized = sanitized.replace(/\+/g, "");

    if (hasLeadingPlus) {
        sanitized = `+${sanitized}`;
    }

    return sanitized;
}

function normalizePhoneNumber(value) {
    return sanitizePhoneNumber(value).trim();
}

function isValidPhoneNumber(value) {
    if (!value) {
        return false;
    }

    /*
     * Exige pelo menos um dígito.
     * O formato final aceito pelo Amazon Connect dependerá
     * das regras de outbound e do plano de discagem da instância.
     */
    return /\d/.test(value);
}