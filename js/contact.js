import { appState, resetContactState } from "./state.js";
import { elements } from "./dom.js";
import { showMessage, writeLog } from "./feedback.js";
import { DEBUG } from "./config.js";
import { updateOutboundAvailability } from "./outbound.js";

import {
    normalizeState,
    getContactStatusType,
    getConnectionStatusType,
    getContactInitiationMethod,
    getContactDirection,
    isInboundContact,
    getAgentConnection,
    isConnectionConnected,
    isConnectionOnHold,
    getHeldConnection,
    getContactConnectionsSnapshot
} from "./connect-helpers.js";

export function handleContact(contact) {
    const contactType = normalizeState(contact.getType());

    if (contactType !== "voice") {
        writeLog(`Contato ignorado pelo painel de voz: ${contactType}`);
        return;
    }

    appState.currentContact = contact;
    appState.currentContactPhase = "initializing";
    appState.currentHoldState = false;
    appState.outboundActionPending = false;

    updateOutboundAvailability();

    writeLog(`Contato detectado: ${contact.getContactId()}`);

    inferInitialContactPhase(contact);
    updateContactPanel();

    bindContactEvent(contact, "onIncoming", () => {
        appState.currentContactPhase = "incoming";
        appState.currentHoldState = false;
        writeLog("Evento: chamada entrando.");
        showMessage("Nova chamada recebida.", "info");
        updateContactPanel();
    });

    bindContactEvent(contact, "onAccepted", () => {
        appState.currentContactPhase = "accepted";
        appState.currentHoldState = false;
        writeLog("Evento: chamada aceita.");
        showMessage("Chamada atendida.", "success");
        updateContactPanel();
    });

    bindContactEvent(
        contact,
        "onConnecting",
        () => {
            if (
                appState.currentContactPhase
                !== "incoming"
            ) {
                appState.currentContactPhase =
                    "connecting";
            }

            writeLog(
                "Evento: chamada conectando."
            );

            updateContactPanel();
        }
    );

    bindContactEvent(contact, "onConnected", () => {
        appState.currentContactPhase = "connected";
        appState.currentHoldState = false;
        writeLog("Evento: chamada conectada.");
        updateContactPanel();
    });

    bindContactEvent(contact, "onRefresh", () => {
        synchronizeConnectionState();
        updateContactPanel();
    });

    bindContactEvent(contact, "onEnded", () => {
        appState.currentContactPhase = "ended";
        appState.currentHoldState = false;
        writeLog("Evento: chamada encerrada.");
        showMessage("Chamada encerrada.", "info");
        updateContactPanel();

        window.setTimeout(() => {
            if (
                appState.currentContact
                && appState.currentContact.getContactId() === contact.getContactId()
            ) {
                resetContactPanel();
            }
        }, 1000);
    });

    bindContactEvent(contact, "onMissed", () => {
        appState.currentContactPhase = "missed";
        appState.currentHoldState = false;
        writeLog("Evento: chamada perdida.");
        updateContactPanel();
    });

    bindContactEvent(contact, "onRejected", () => {
        appState.currentContactPhase = "rejected";
        appState.currentHoldState = false;
        writeLog("Evento: chamada rejeitada.");
        updateContactPanel();
    });
}

function bindContactEvent(contact, eventName, callback) {
    if (typeof contact[eventName] === "function") {
        contact[eventName](callback);
    }
}

function inferInitialContactPhase(contact) {
    let contactStatus = "";

    try {
        const status = contact.getStatus();

        contactStatus = normalizeState(
            status?.type || status?.name
        );

    } catch (error) {
        console.warn(
            "Não foi possível ler o estado inicial do contato.",
            error
        );
    }

    const agentConnection =
        getAgentConnection(contact);

    const connectionStatus =
        getConnectionStatusType(
            agentConnection
        );

    const initiationMethod =
        getContactInitiationMethod(contact);

    const inbound =
        isInboundContact(contact);

    const pendingIncoming =
        isAgentPendingIncoming();

    const connected =
        isConnectionConnected(
            agentConnection
        );

    writeLog(
        `Estado inicial: `
        + `contato=${contactStatus || "-"}, `
        + `conexão=${connectionStatus || "-"}, `
        + `iniciação=${initiationMethod || "-"}, `
        + `inbound=${inbound}, `
        + `pendingIncoming=${pendingIncoming}`
    );

    if (contactStatus === "incoming") {
        appState.currentContactPhase =
            "incoming";

        return;
    }

    /*
     * No seu ambiente, uma chamada tocando chegou como:
     *
     * contato=connecting
     * conexão=connecting
     * agente=PendingBusy
     *
     * Portanto essa combinação também representa
     * chamada aguardando ação do agente.
     */
    if (
        contactStatus === "connecting"
        && !connected
        && (
            inbound
            || initiationMethod === "inbound"
            || pendingIncoming
        )
    ) {
        appState.currentContactPhase =
            "incoming";

        return;
    }

    if (
        isConnectionOnHold(
            agentConnection
        )
    ) {
        appState.currentContactPhase =
            "connected";

        appState.currentHoldState =
            true;

        return;
    }

    if (connected) {
        appState.currentContactPhase =
            "connected";

        appState.currentHoldState =
            false;

        return;
    }

    appState.currentContactPhase =
        contactStatus || "initializing";
}


export function synchronizeConnectionState() {
    const contact =
        appState.currentContact;

    if (!contact) {
        return;
    }

    const heldConnection =
        getHeldConnection(contact);

    /*
     * Aguardando a confirmação do hold.
     */
    if (
        appState.holdActionPending
        === "holding"
    ) {
        if (heldConnection) {
            appState.currentHoldState =
                true;

            appState.holdActionPending =
                null;

            writeLog(
                "Hold confirmado na conexão da chamada."
            );
        }

        return;
    }

    /*
     * Aguardando a confirmação da retomada.
     *
     * Só confirmamos quando não houver mais conexão
     * efetivamente marcada como hold.
     */
    if (
        appState.holdActionPending
        === "resuming"
    ) {
        if (!heldConnection) {
            appState.currentHoldState =
                false;

            appState.holdActionPending =
                null;

            writeLog(
                "Retomada confirmada: "
                + "nenhuma conexão permanece em hold."
            );
        }

        return;
    }

    /*
     * Sincronização normal.
     */
    if (heldConnection) {
        appState.currentHoldState =
            true;

        return;
    }

    appState.currentHoldState =
        false;
}

export function updateContactPanel() {
    const contact =
        appState.currentContact;

    if (!contact) {
        resetContactPanel();
        return;
    }

    const contactStatus =
        getContactStatusType(contact);

    const agentConnection =
        getAgentConnection(contact);

    const connectionStatus =
        getConnectionStatusType(
            agentConnection
        );

    const initiationMethod =
        getContactInitiationMethod(contact);

    const inbound =
        isInboundContact(contact);

    const pendingIncoming =
        isAgentPendingIncoming();

    synchronizeConnectionState();

    const connected =
        isConnectionConnected(
            agentConnection
        );

    const heldConnection =
        getHeldConnection(contact);

    const held =
        Boolean(heldConnection)
        || appState.currentHoldState;

    const ended = [
        "ended",
        "destroyed",
        "missed",
        "rejected",
        "error"
    ].includes(
        appState.currentContactPhase
    )
        || [
            "ended",
            "destroyed",
            "error"
        ].includes(contactStatus);

    /*
     * Uma chamada é considerada tocando quando:
     *
     * 1. A fase criada pelos eventos é incoming; ou
     * 2. O estado do contato é incoming; ou
     * 3. Ela está connecting, ainda não conectou e:
     *    - foi identificada como inbound; ou
     *    - initiationMethod é inbound; ou
     *    - o agente está PendingBusy.
     */
    const ringing =
        !ended
        && !connected
        && (
            appState.currentContactPhase
            === "incoming"

            || contactStatus
            === "incoming"

            || (
                contactStatus
                === "connecting"

                && (
                    inbound
                    || initiationMethod
                    === "inbound"
                    || pendingIncoming
                )
            )
        );

    elements.contactId.textContent =
        contact.getContactId();

    elements.contactType.textContent =
        contact.getType() || "-";

    elements.contactState.textContent = [
        `fase=${appState.currentContactPhase}`,
        `contato=${contactStatus || "-"}`,
        `conexão=${connectionStatus || "-"}`,
        `iniciação=${initiationMethod || "-"}`,
        `pending=${pendingIncoming}`
    ].join(" | ");

    elements.contactDirection.textContent =
        getContactDirection(contact);

    elements.btnAccept.disabled =
        !ringing;

    elements.btnReject.disabled =
        !ringing;

    const holdActionPending =
        appState.holdActionPending;

    elements.btnHold.disabled =
        !agentConnection
        || (!connected && !held)
        || ended
        || Boolean(holdActionPending);

    if (
        holdActionPending
        === "holding"
    ) {
        elements.btnHold.textContent =
            "Colocando em espera...";

    } else if (
        holdActionPending
        === "resuming"
    ) {
        elements.btnHold.textContent =
            "Retomando...";

    } else {
        elements.btnHold.textContent =
            held ? "Retomar" : "Hold";
    }

    elements.btnEnd.disabled =
        !agentConnection
        || ended;

    if (DEBUG) {
        console.log(
            "Estado calculado do painel:",
            {
                phase:
                    appState.currentContactPhase,

                contactStatus,
                connectionStatus,
                initiationMethod,
                inbound,
                pendingIncoming,
                ringing,
                connected,
                held,
                ended,

                holdActionPending:
                    appState.holdActionPending,

                connections:
                    getContactConnectionsSnapshot(contact)

            }
        );
    }
}

export function resetContactPanel() {
    resetContactState();

    elements.contactId.textContent =
        "Nenhum contato";

    elements.contactType.textContent = "-";
    elements.contactState.textContent = "-";
    elements.contactDirection.textContent = "-";

    elements.btnAccept.disabled = true;
    elements.btnReject.disabled = true;
    elements.btnHold.disabled = true;
    elements.btnEnd.disabled = true;

    elements.btnHold.textContent = "Hold";

    updateOutboundAvailability();
}

function isAgentPendingIncoming() {
    const agent = appState.currentAgent;

    if (!agent) {
        return false;
    }

    try {
        const state = agent.getState();

        const stateName =
            normalizeState(state?.name);

        const stateType =
            normalizeState(state?.type);

        return [
            "pendingbusy",
            "pending_busy"
        ].includes(stateName)
            || [
                "pendingbusy",
                "pending_busy"
            ].includes(stateType);

    } catch (error) {
        console.warn(
            "Não foi possível consultar o estado do agente.",
            error
        );

        return false;
    }
}